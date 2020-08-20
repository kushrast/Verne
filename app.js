let map;
var geoKeywordsList;

$(document).ready(function() {
	$('#recommendations-list').on('click', '.recommendation', function() {
		searchWikipediaAndReload(this.innerHTML);
	});
});


function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 37.7159, lng: -121.9101 },
    zoom: 8
  });

  map.addListener('center_changed', function() {
    // 3 seconds after the center of the map has changed, pan back to the
    // marker.
    var lat = map.center.lat();
    var lng = map.center.lng();

    switchToNewLocation(lat, lng);
  });
}

function switchToNewLocation(lat, lng) {
	var data = reverseGeocodeLatLng(lat, lng);
    
    if (data != null) {
	    data.then(response => {
	    	showLoadingBar();
	    	setWikiUrl("");

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
    return locationsAndTypes;
}

function isAcceptableLocationType(locationType) {
	switch(locationType) {
		case "colloquial_area":
		case "administrative_area_level_1":
		case "administrative_area_level_2":
		case "country":
		case "political":
		case "locality":
			return true;
		default:
			return false;
	}
}

function reverseGeocodeLatLng(lat, lng) {
    var geocodingLink = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyBm-lj_8Dm-mGESYObrzWGcVd1Siue4iYk`;

    return fetch(geocodingLink)
    	.then(response => {
    		return response.json();
    });
}