let map;
let marker;
var geoKeywordsList;

var gracePeriodMs = 2000;
var waitingForGracePeriod = false;
var gracePeriodTimeoutFn = null;
var gracePeriodTimer = null;

$(document).ready(function() {
	$('#recommendations-list').on('click', '.recommendation', function() {
		searchWikipediaAndReload(this.innerHTML);
	});
});


function initMap() {
	var defaultLat = 37.7159;
	var defaultLng = -121.9101;

  	map = new google.maps.Map(document.getElementById("map"), {
    	center: { lat: defaultLat, lng: defaultLng },
    	zoom: 8
  	});

  	marker = new google.maps.Marker({
		position: {lat: defaultLat, lng: defaultLng},
		map: map,
		title: 'Loc'
	});

	// Try HTML5 geolocation.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        var pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        map.setCenter(pos);
        map.setZoom(12);
        switchToNewLocation(pos.lat, pos.lng);

      }, function() {
      	handleLocationError(true);
      	  switchToNewLocation(defaultLat, defaultLng);
      });
    } else {
    	handleLocationError(false);
    	switchToNewLocation(defaultLat, defaultLng);
      // Browser doesn't support Geolocation
    }

  map.addListener('center_changed', function() {
    // 3 seconds after the center of the map has changed, pan back to the
    // marker.
    var lat = map.center.lat();
    var lng = map.center.lng();

    scheduleDataReload(lat, lng);
  });

  map.addListener('zoom_changed', function() {
    delayDataReload();
  });

  map.addListener('click', function(clickEvent) {
    var lat = clickEvent.latLng.lat();
    var lng = clickEvent.latLng.lng();

    switchToNewLocation(lat, lng);
  });
}

function handleLocationError(browserHasGeolocation) {
	if (browserHasGeolocation) {
		alert("Ran into error while trying to get your location.");
	} else {
		alert("Your browser doesn't support geolocation.");
	}
}

function scheduleDataReload(lat, lng) {
	if (waitingForGracePeriod) {
		clearTimeout(gracePeriodTimer);
	} else {
		setLoadingPage();
	}
	waitingForGracePeriod = true;
	gracePeriodTimeoutFn = function(){switchToNewLocation(lat, lng)};
	delayDataReload();
}

function delayDataReload() {
	if (waitingForGracePeriod) {
		clearTimeout(gracePeriodTimer);
		gracePeriodTimer = setTimeout(gracePeriodTimeoutFn, gracePeriodMs);
	}
}

function setLoadingPage() {
	showLoadingBar();
	setWikiUrl("");
}

function switchToNewLocation(lat, lng) {
	if (waitingForGracePeriod){
		clearTimeout(gracePeriodTimer);
	}
	waitingForGracePeriod = false;

	marker.setPosition( new google.maps.LatLng( lat, lng ) );
	var data = reverseGeocodeLatLng(lat, lng);
    
    if (data != null) {
	    data.then(response => {
	    	var results = response.results;
	    	var geoKeywordsByLocationType = parseGeocodingResults(results);
	    	geoKeywordsList = getGeoKeywordsList(geoKeywordsByLocationType);
	    	var mainKeyword = pickMainKeywordfromGeocodingResults(geoKeywordsByLocationType);

	    	if (mainKeyword != null) {
		    	searchWikipediaAndReload(mainKeyword);
	    	}
	    });
    }
}

function searchWikipediaAndReload(mainKeyword) {
	searchWikipedia(mainKeyword)
	    .then(function(response) {
	        var matchedPages = response.query.search;
	        if (matchedPages.length > 1) {
	        	var currentUrl = getWikiUrl();
	        	var newUrl = "https://en.wikipedia.org/wiki/" + matchedPages[0].title.replace(/ /g,"_");

	        	if (currentUrl != newUrl) {
	        		setWikiUrl(newUrl);
	        	}

	        	hideLoadingBar();

	        	addRecommendedSearches(geoKeywordsList);
	        }
	    });
}

function searchForNewQuery(keyword) {
	showLoadingBar();
	setWikiUrl("");
	console.log(keyword);
	searchWikipediaAndReload(keyword);
}

function addRecommendedSearches(geoKeywordsList) {
	var recommendationsDiv = document.getElementById("recommendations-list");

	recommendationsDiv.innerHTML = "";

	for (i in geoKeywordsList) {
		var keyword = geoKeywordsList[i];
		var node = document.createElement("div");
		node.classList.add("recommendation");
		node.innerHTML = keyword;

		recommendationsDiv.appendChild(node);
	}
}

function getGeoKeywordsList(geoKeywordsByLocationType) {
	var keywordsMap = {};
	for (locationType in geoKeywordsByLocationType) {
		for (keyword in geoKeywordsByLocationType[locationType]) {
			keywordsMap[keyword] = 1;
		}
	}

	return Object.keys(keywordsMap);
}

function pickMainKeywordfromGeocodingResults(geoKeywords) {
	var administrative_area_level_1;
	if ("administrative_area_level_1" in geoKeywords) {
		administrative_area_level_1 = Object.keys(geoKeywords["administrative_area_level_1"])[0];
	}

	if ("locality" in geoKeywords) {
		return Object.keys(geoKeywords["locality"])[0] + " " + administrative_area_level_1;
	}
	if ("colloquial_area" in geoKeywords) {
		return Object.keys(geoKeywords["colloquial_area"])[0] + " " + administrative_area_level_1;
	}
	if ("administrative_area_level_1" in geoKeywords) {
		return Object.keys(geoKeywords["administrative_area_level_1"])[0];
	}
	if ("administrative_area_level_2" in geoKeywords) {
		return Object.keys(geoKeywords["administrative_area_level_2"])[0];
	}
	if ("country" in geoKeywords) {
		return Object.keys(geoKeywords["country"])[0];
	}
	if ("political" in geoKeywords) {
		return Object.keys(geoKeywords["political"])[0];
	}
	return null;
}

function getWikiUrl() {
	return document.getElementById('wiki_iframe').src;
}

function setWikiUrl(url) {
	document.getElementById('wiki_iframe').src = url;
}

function showLoadingBar() {
	var loadingBar = document.getElementById("loading-bar");
	loadingBar.style.visibility = "visible";
}

function hideLoadingBar() {
	var loadingBar = document.getElementById("loading-bar");
	loadingBar.style.visibility = "hidden";
}

function searchWikipedia(searchQuery) {
	var url = "https://en.wikipedia.org/w/api.php"; 

	var params = {
	    action: "query",
	    list: "search",
	    srsearch: searchQuery,
	    format: "json"
	};

	url = url + "?origin=*";
	Object.keys(params).forEach(function(key){url += "&" + key + "=" + params[key];});

	return fetch(url)
	    .then(function(response){return response.json();});
}

function parseGeocodingResults(results) {
	var locationsAndTypes = {}
	for (result of results) {
		for (addrComponent of result.address_components) {
			var addrName = addrComponent.long_name;

			for (locationType of addrComponent.types) {

				if (isAcceptableLocationType(locationType)) {
					if (!locationsAndTypes.hasOwnProperty(locationType)) {
						locationsAndTypes[locationType] = {}
					}
					locationsAndTypes[locationType][addrName] = 1;
				}
			}
		}
	}
	console.log(locationsAndTypes)
    return locationsAndTypes;
}

/*	Zoom Levels
	20 or smaller - neighborhood
	12 or smaller - city
	10 or smaller - county
	5 or smaller - state
	1 or smaller - country
*/
function isAcceptableLocationType(locationType) {
	var acceptableLocations;
	var zoomLevel = map.getZoom();

	if (zoomLevel >= 11) {
		acceptableLocations = ["neighborhood", "sublocality", "locality", "colloquial_area", 
		"administrative_area_level_1", "administrative_area_level_2", "country"];
	} else {
		acceptableLocations = ["locality", 
		"administrative_area_level_1", "administrative_area_level_2", "country"];
	}

	return acceptableLocations.includes(locationType);
}


function reverseGeocodeLatLng(lat, lng) {
    var geocodingLink = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyBm-lj_8Dm-mGESYObrzWGcVd1Siue4iYk`;

    return fetch(geocodingLink)
    	.then(response => {
    		return response.json();
    });
}