function mostrarErro(msg) {
  const caixa = document.getElementById('erro-aviso');
  caixa.style.display = 'block';
  caixa.innerHTML = '<b>Não foi possível carregar o mapa:</b><br>' + msg;
}

window.addEventListener('error', (e) => {
  mostrarErro(e.message || 'erro desconhecido ao carregar script.');
});

async function iniciar() {
  if (typeof L === 'undefined') {
    mostrarErro('A biblioteca do mapa (Leaflet) não carregou. Verifique sua conexão ou se algum bloqueador de anúncios/firewall está impedindo o carregamento de scripts externos.');
    return;
  }
  const mapa = L.map('mapa');

  const satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 20,
    attribution: 'Tiles &copy; Esri'
  });

  const ruas = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors'
  });

  satelite.addTo(mapa);

  const corPorClasse = {
    "Perene": "#1f6fb2",
    "Intermitente": "#52a8d8",
    "Efemero": "#9bcbe8"
  };

  let hidro, nasc;
  try {
    const [hidroResp, nascResp] = await Promise.all([
      fetch('hidrografia.geojson'),
      fetch('nascentes.geojson')
    ]);
    if (!hidroResp.ok || !nascResp.ok) {
      throw new Error(`Falha ao buscar arquivos (status ${hidroResp.status}/${nascResp.status}).`);
    }
    hidro = await hidroResp.json();
    nasc = await nascResp.json();
  } catch (err) {
    mostrarErro('Não foi possível carregar os arquivos .geojson. Detalhe: ' + err.message);
    return;
  }

  const camadaHidro = L.geoJSON(hidro, {
    style: (feature) => {
      const classe = feature.properties.CLASSE;
      return {
        color: corPorClasse[classe] || "#1f6fb2",
        weight: 3,
        dashArray: classe === "Efemero" ? "6 4" : null
      };
    },
    onEachFeature: (feature, layer) => {
      const classe = feature.properties.CLASSE || "Não informado";
      layer.bindPopup(`<b>Curso d'água</b><br>Classe: ${classe}`);
    }
  }).addTo(mapa);

  const camadaNascentes = L.geoJSON(nasc, {
    pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
      radius: 7,
      fillColor: "#2f7a6e",
      color: "#fff",
      weight: 2,
      fillOpacity: 0.9
    }),
    onEachFeature: (feature, layer) => {
      const id = feature.properties.Id ?? "-";
      layer.bindPopup(`<b>Nascente</b><br>Id: ${id}`);
    }
  }).addTo(mapa);

  L.control.layers({
    "Satélite": satelite,
    "Mapa de ruas": ruas
  }, {
    "Hidrografia": camadaHidro,
    "Nascentes": camadaNascentes
  }, { collapsed: false }).addTo(mapa);

  const limites = camadaHidro.getBounds().extend(camadaNascentes.getBounds());
  mapa.fitBounds(limites, { padding: [30, 30] });
}

iniciar();
