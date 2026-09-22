window.VACANCY_MAP_TILES=Object.freeze({
  url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  options:{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
});
window.vacancyTileLayer=function(map){return L.tileLayer(VACANCY_MAP_TILES.url,VACANCY_MAP_TILES.options).addTo(map)};
