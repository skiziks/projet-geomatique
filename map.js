let divmap = document.getElementById("map");
let breadcrumbElement = document.getElementById("breadcrumb");

let layer = L.tileLayer('https://tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token={accessToken}', {
    attribution: '<a href="https://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    minZoom: 0,
    maxZoom: 22,
    accessToken: 'H2h0Jx9SUlnTFKSvAuhqfplwTUpFMPQL7J35nEptiCKhwy776J7TTk8m5QR6IKyZ'
});

let map = L.map(divmap, {
    center: [47.0811658, 2.399125],
    zoom: 6,
    layers: [layer]
});

// const partyColors = {
//     "LAGUILLER (LO)": "#FF0000",
//     "KRIVINE (LCR)": "#800080",   
//     "MITTERRAND (PS)": "#0000FF",
//     "MULLER (MDSR)": "#008000",  
//     "DUMONT (ECO)": "#00FF00",    
//     "GISCARD D'ESTAING (RI)": "#FFFF00", 
//     "CHABAN-DELMAS (UDR)": "#FFA500",  
//     "RENOUVIN (NAR)": "#A52A2A",  
//     "ROYER (DVD)": "#000000",     
//     "LE PEN (FN)": "#000080",     
//     "HERAUD (DIV)": "#808080",   
//     "SEBAG (DIV)": "#C0C0C0"      
// };


let regionsLayerGroup = L.layerGroup().addTo(map);
let departementsLayerGroup = L.layerGroup().addTo(map);
let communesLayerGroup = L.layerGroup().addTo(map);

var currentLayer = { name: "Régions", data: null, parent: null };
var breadcrumb = [];
let depth = 0;

function hover(layer) {
    layer.on('mouseover', function () {
        layer.setStyle({
            weight: 5, 
            opacity: 1
        });
    });

    layer.on('mouseout', function () {
        layer.setStyle({
            weight: 1, 
            opacity: 0.8
        });
    });
}

// Fonction de mise à jour du fil d’Ariane
function updateBreadcrumb(newLayerName) {
    if (breadcrumb.length === 3) {
        breadcrumb.shift(); // Retirer le premier élément si on atteint la limite de 3
    }
    
    breadcrumb.push(newLayerName);
    console.log("Fil d'Ariane mis à jour :", breadcrumb);

    let breadcrumbString = breadcrumb.map((name, index) => {
        return `<a href="#" onclick="breadcrumbClick(${index})">${name}</a>`;
    }).join(" > ");

    breadcrumbElement.innerHTML = breadcrumbString;
    depth = breadcrumb.length;

    clearLayers(depth);
}

// Fonction de gestion des clics sur le fil d’Ariane
function breadcrumbClick(index) {
    depth = index + 1;

    // Nettoyage des couches en fonction du niveau cliqué
    if (depth === 1) {
        // Clic sur une région
        let regionName = breadcrumb[0];
        breadcrumb = [regionName];
        console.log(`Retour à la région : ${regionName}`);
        clearLayers(1); // Supprimer les couches des départements et communes
        zoomToRegion(regionName); // Recentrer sur la région
    } else if (depth === 2) {
        let regionName = breadcrumb[0];
        let departementName = breadcrumb[1];
        breadcrumb = [regionName, departementName];
        console.log(`Retour au département : ${departementName}`);
        clearLayers(2); // Supprimer les couches des communes
        zoomToDepartement(departementName);
    } else if (depth === 3) {
        // Clic sur une commune (pour future implémentation si nécessaire)
        console.log("Niveau commune cliqué : aucune action requise.");
    }

    // Mise à jour de l’affichage du fil d’Ariane
    let breadcrumbString = breadcrumb.map((name, idx) => {
        return `<a href="#" onclick="breadcrumbClick(${idx})">${name}</a>`;
    }).join(" > ");
    breadcrumbElement.innerHTML = breadcrumbString;
}

function zoomToRegion(regionName) {
    fetch("ressources/geojson/regions.geojson")
        .then(response => response.json())
        .then(data => {
            let regionFeature = data.features.find(feature => feature.properties.nom.trim() === regionName);
            if (regionFeature) {
                let regionLayer = L.geoJSON(regionFeature);
                map.fitBounds(regionLayer.getBounds());
                fetch("ressources/geojson/departements.geojson")
                    .then(response => response.json())
                    .then(departementsData => {
                        let filteredDepartements = departementsData.features.filter(departement =>
                            regionLayer.getBounds().contains(L.geoJSON(departement).getBounds())
                        );
                        let filteredGeoJson = {
                            type: "FeatureCollection",
                            features: filteredDepartements
                        };
                        departementsLayerGroup.clearLayers();
                        L.geoJSON(filteredGeoJson, {
                            style: {
                                color: '#F1F1F1',
                                weight: 1,
                                opacity: 0.8
                            },
                            onEachFeature: function (feature, layer) {
                                layer.on('click', function () {
                                    const cleanName = feature.properties.nom.trim();
                                    updateBreadcrumb(cleanName);
                                    moveToCommunes(layer);
                                });
                            }
                        }).addTo(departementsLayerGroup);
                    })
                    .catch(error => console.error("Erreur lors du chargement des départements :", error));
            }
        })
        .catch(error => console.error("Erreur lors du chargement des régions :", error));
}


function clearLayers(upToDepth) {
    if (upToDepth < 1) {
        regionsLayerGroup.clearLayers();
    }
    if (upToDepth < 2) {
        departementsLayerGroup.clearLayers();
    }
    if (upToDepth < 3) {
        communesLayerGroup.clearLayers();
    }
}

// Fonction pour zoomer sur un département à partir de son nom
function zoomToDepartement(departementName) {
    fetch("ressources/geojson/departements.geojson")
        .then(response => response.json())
        .then(data => {
            let departementFeature = data.features.find(feature => feature.properties.nom.trim() === departementName);
            if (departementFeature) {
                // Créer la couche Leaflet à partir du feature pour zoomer
                let departementLayer = L.geoJSON(departementFeature);
                map.fitBounds(departementLayer.getBounds()); // Zoomer sur les limites du département

                // Charger les communes du département
                fetch(`https://geo.api.gouv.fr/departements/${departementFeature.properties.code}/communes?fields=nom,code,contour`)
                    .then(response => response.json())
                    .then(communes => {
                        let communesFeatures = communes.map(commune => {
                            if (!commune.contour) {
                                console.warn(`Aucun contour trouvé pour ${commune.nom} (${commune.code})`);
                                return null;
                            }
                            return {
                                type: "Feature",
                                properties: {
                                    code: commune.code,
                                    nom: commune.nom
                                },
                                geometry: commune.contour
                            };
                        }).filter(feature => feature !== null);

                        // Créer un GeoJSON avec les communes filtrées
                        let communesGeoJson = {
                            type: "FeatureCollection",
                            features: communesFeatures
                        };

                        // Nettoyer les anciennes couches de communes
                        communesLayerGroup.clearLayers();

                        // Ajouter les communes comme une nouvelle couche
                        L.geoJSON(communesGeoJson, {
                            style: {
                                color: '#2ca02c',
                                weight: 1,
                                opacity: 0.8
                            },
                            onEachFeature: function (feature, layer) {
                                layer.on('click', function () {
                                    const cleanName = feature.properties.nom.trim();
                                    updateBreadcrumb(cleanName);
                                    map.fitBounds(layer.getBounds()); // Zoomer sur la commune
                                });
                            }
                        }).addTo(communesLayerGroup);
                    })
                    .catch(error => console.error("Erreur lors de la requête API des communes :", error));
            }
        })
        .catch(error => console.error("Erreur lors du chargement des départements :", error));
}











// Generate layer by date selection and round

const partyColors = {
    "RPR": "#1f77b4",
    "FN": "#d62728",
    "PS": "#2ca02c",
    "UDF": "#ff7f0e",
    "PCF": "#9467bd",
    "ECO": "#8c564b",
    "DIV": "#e377c2",
    "DVD": "#7f7f7f",
    "DVG": "#bcbd22",
    "LO": "#17becf",
    "UMP": "#0055a4",
    "NPA": "#dd1c77",
    "UDR": "#4682b4",
    "UNR": "#4682b4",
    "CIR": "#6a5acd",
    "RI": "#f4a460",
};

function getPartyColor(party) {
    const match = party.match(/\((.*?)\)/);
    if (match) {
        const partyName = match[1];
        return partyColors[partyName] || "#cccccc";
    }
    return "#F1F1F1";
}

async function generateLayerByGeoJson(file, layerGroup) {
    const selectYearElement = document.getElementById("selectYear");
    const selectTourElement = document.getElementById("tour");

    function getSelectedYear() {
        return selectYearElement.options[selectYearElement.selectedIndex]?.value || availableYear[0];
    }

    function getSelectedTour() {
        return selectTourElement.options[selectTourElement.selectedIndex]?.value || '1';
    }

    async function loadAndUpdateData() {
        const selectedYear = getSelectedYear();
        const selectedTour = getSelectedTour();
        const data = await loadDataPresidentielles(selectedYear, selectedTour);

        fetch(file)
            .then(response => response.json())
            .then(geoJsonData => {
                layerGroup.clearLayers();

                let geoJsonLayer = L.geoJSON(geoJsonData, {
                    style: {
                        color: '#F1F1F1',
                        weight: 1,
                        fillOpacity: 0.7
                    },
                    onEachFeature: async function (feature, layer) {
                        const regionCode = feature.properties.code;
                        const regionData = await getByRegion(data, regionCode);

                        const winningParty = Object.keys(regionData)
                            .filter(key => key !== 'code_region' && key !== 'inscrits' && key !== 'votants' && key !== 'exprimes' && key !== 'blancs_et_nuls')
                            .reduce((maxParty, currentParty) => regionData[currentParty] > (regionData[maxParty] || 0) ? currentParty : maxParty, '');

                        // console.log(`Données pour la région ${regionCode}:`, regionData);
                        // console.log(`Région: ${feature.properties.nom}, Parti gagnant: ${winningParty}, Votes: ${regionData[winningParty]}`);
                        // console.log(`Couleur attribuée à ${winningParty}: ${getPartyColor(winningParty)}`);

                        const fillColor = getPartyColor(winningParty);

                        if (!winningParty || regionData[winningParty] === 0) {
                            console.warn(`Pas de données valides pour la région ${regionCode}`);
                            return;
                        }

                        layer.setStyle({
                            color: fillColor,
                            weight: 1,
                            fillOpacity: 0.2,
                            fillColor: fillColor
                        });

                        // Afficher un popup temporaire au survol de la souris avec le nom du parti gagnant
                        // const popupContent = `<b>Parti gagnant :</b> ${winningParty}`;
                        // const center = layer.getBounds().getCenter();
                        // const popup = L.popup({
                        //     className: 'region-popup',
                        //     closeButton: false,
                        //     autoClose: false
                        // }).setLatLng(center).setContent(popupContent);

                        layer.on('mouseover', function () {
                            layer.setStyle({ weight: 3 });
                            // popup.openOn(layer._map);
                        });

                        layer.on('mouseout', function () {
                            layer.setStyle({ weight: 1 });
                            // layer._map.closePopup(popup);
                        });

                        layer.on('click', function () {
                            const cleanName = feature.properties.nom.trim();
                            updateBreadcrumb(cleanName);
                            moveToDepartements(layer);
                            console.log("Région sélectionnée", cleanName);
                        });
                    }
                });

                geoJsonLayer.addTo(layerGroup);
            })
            .catch(error => console.error("Erreur lors du chargement du GeoJSON :", error));
    }

    loadAndUpdateData();

    selectYearElement.addEventListener("change", loadAndUpdateData);
    selectTourElement.addEventListener("change", loadAndUpdateData);
}
















function dynamicClearLayers(level) {
    switch (level) {
        case "region":
            departementsLayerGroup.clearLayers();
            communesLayerGroup.clearLayers();
            break;
        case "departement":
            communesLayerGroup.clearLayers();
            break;
        case "commune":
            break;
        default:
            regionsLayerGroup.clearLayers();
            departementsLayerGroup.clearLayers();
            communesLayerGroup.clearLayers();
            break;
    }
}

// Naviguer vers les départements d'une région
let departmentLabelsLayer = L.layerGroup().addTo(map);

async function moveToDepartements(regionLayer) {
    dynamicClearLayers("region");
    departmentLabelsLayer.clearLayers();

    let regionCode = regionLayer.feature.properties.code;
    console.log(`Région sélectionnée : ${regionCode}`);
    map.fitBounds(regionLayer.getBounds());

    let departements = await fetchData(`https://geo.api.gouv.fr/regions/${regionCode}/departements`);
    console.log("Départements chargés :", departements);

    let selectedYear = document.getElementById("selectYear").value;
    let selectedTour = document.getElementById("tour").value;
    console.log(`Année sélectionnée : ${selectedYear}, Tour : ${selectedTour}`);

    fetch("ressources/geojson/departements.geojson")
        .then(response => response.json())
        .then(async geojsonData => {
            let filteredDepartements = geojsonData.features.filter(feature =>
                departements.some(dep => dep.code === feature.properties.code)
            );
            console.log("Départements filtrés par région :", filteredDepartements);

            let data = await loadDataPresidentielles(selectedYear, selectedTour);
            console.log("Données électorales chargées :", data);

            let departementLayer = L.geoJSON(filteredDepartements, {
                style: function (feature) {
                    let departementResults = getByDepartmentCode(data, feature.properties.code) || [];
                    let totalVotesByParty = {};

                    if (departementResults.length === 0) {
                        console.warn(`Aucun résultat trouvé pour le département ${feature.properties.nom}`);
                        return { color: "#cccccc", weight: 1, fillOpacity: 0.2, fillColor: "#cccccc" };
                    }

                    departementResults.forEach(result => {
                        for (let [party, votes] of Object.entries(result)) {
                            if (party.match(/^.*\)$/g)) {
                                totalVotesByParty[party] = (totalVotesByParty[party] || 0) + votes;
                            }
                        }
                    });

                    let winningParty = Object.keys(totalVotesByParty).reduce((maxParty, currentParty) =>
                        totalVotesByParty[currentParty] > (totalVotesByParty[maxParty] || 0) ? currentParty : maxParty,
                        Object.keys(totalVotesByParty)[0] || ""
                    );

                    let fillColor = partyColors[winningParty.match(/\((.*?)\)/)?.[1]] || "#cccccc";
                    console.log(`Parti gagnant pour ${feature.properties.nom} : ${winningParty}, Couleur : ${fillColor}`);

                    return {
                        color: fillColor,
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.5,
                        fillColor: fillColor
                    };
                },
                onEachFeature: function (feature, layer) {
                    layer.on('click', function () {
                        const cleanName = feature.properties.nom.trim();
                        updateBreadcrumb(cleanName);
                        moveToCommunes(layer);
                    });

                    let center = layer.getBounds().getCenter();
                    let winningParty = getWinningPartyForFeature(feature, data);
                    if (winningParty) {
                        let textLabel = L.divIcon({
                            className: 'winning-party-label',
                            html: `<div style="background-color: white; padding: 2px 5px; border-radius: 5px; box-shadow: 0 0 3px rgba(0,0,0,0.3);">${winningParty}</div>`,
                            iconSize: [100, 30]
                        });
                        L.marker(center, { icon: textLabel }).addTo(departmentLabelsLayer);
                    }

                    hover(layer);
                }
            });

            departementLayer.addTo(departementsLayerGroup);

            regionsLayerGroup.eachLayer(layer => {
                layer.setStyle({
                    fillOpacity: 0,
                    color: "#ffffff",
                    weight: 1
                });
            });
        })
        .catch(error => console.error("Erreur lors du chargement du GeoJSON des départements :", error));
}

function getWinningPartyForFeature(feature, data) {
    let departementResults = getByDepartmentCode(data, feature.properties.code);
    let totalVotesByParty = {};

    departementResults.forEach(result => {
        for (let [party, votes] of Object.entries(result)) {
            if (party.match(/^.*\)$/g)) {
                totalVotesByParty[party] = (totalVotesByParty[party] || 0) + votes;
            }
        }
    });

    return Object.keys(totalVotesByParty).reduce((maxParty, currentParty) =>
        totalVotesByParty[currentParty] > (totalVotesByParty[maxParty] || 0) ? currentParty : maxParty
    );
}


function moveToCommunes(departementLayer) {
    dynamicClearLayers("departement"); // Nettoyer les couches inférieures
    if (!departementLayer || !departementLayer.feature) {
        console.error("Le département sélectionné n'a pas de couche valide.");
        return;
    }

    let departementCode = departementLayer.feature.properties.code;
    map.fitBounds(departementLayer.getBounds());

    fetch(`https://geo.api.gouv.fr/departements/${departementCode}/communes?fields=nom,code,contour`)
        .then(response => response.json())
        .then(communes => {
            let features = communes.map(commune => {
                if (!commune.contour) {
                    console.warn(`Aucun contour trouvé pour ${commune.nom} (${commune.code})`);
                    return null;
                }
                return {
                    type: "Feature",
                    properties: {
                        code: commune.code, // Code postal
                        nom: commune.nom
                    },
                    geometry: commune.contour
                };
            }).filter(feature => feature !== null);

            let communesGeoJson = {
                type: "FeatureCollection",
                features: features
            };

            let communesLayer = L.geoJSON(communesGeoJson, {
                style: {
                    color: '#2ca02c',
                    weight: 1,
                    opacity: 0.8
                },
                onEachFeature: function (feature, layer) {
                    layer.on('mouseover', function () {
                        layer.setStyle({ weight: 3 });
                    });

                    layer.on('mouseout', function () {
                        layer.setStyle({ weight: 1 });
                    });

                    layer.on('click', function () {
                        const cleanName = feature.properties.nom.trim();
                        const codePostal = feature.properties.code; // Récupérer le code postal
                        console.log(`Commune : ${cleanName}, Code Postal : ${codePostal}`); // Afficher dans la console
                        updateBreadcrumb(cleanName);
                        map.fitBounds(layer.getBounds());
                    });
                }
            });

            communesLayer.addTo(communesLayerGroup);
        })
        .catch(error => console.error("Erreur lors de la requête API des communes :", error));
}


// Charger initialement les régions
generateLayerByGeoJson("ressources/geojson/regions.geojson", regionsLayerGroup);


// Fonction de test pour charger les données présidentielles et afficher les résultats d'une région
async function testElectionData() {
    try {
        // Chargement des données pour l'année 1974, tour 1
        let data = await loadDataPresidentielles('1974', '1');
        
        // Récupérer les résultats par région (exemple : région Occitanie, code 76)
        let regionData = await getByRegion(data, '76');
        console.log('Résultats pour la région Occitanie (code 76) :', regionData);
        
        // Afficher les résultats par département (exemple : Hérault, code 34)
        let departementData = getByDepartementName(data, 'HERAULT');
        console.log('Résultats pour le département Hérault (34) :', departementData);
        
        // Afficher les partis politiques présents
        let parties = getParties(data);
        console.log('Partis politiques présents :', parties);
    } catch (error) {
        console.error('Erreur lors du test des données électorales :', error);
    }
}

// Appel de la fonction de test au chargement de la page
window.onload = async () => {
    await testElectionData();
};