let map;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: -34.397, lng: 150.644 },
    zoom: 8
  });

  map.addListener('center_changed', function() {
    // 3 seconds after the center of the map has changed, pan back to the
    // marker.
    var lat = map.center.lat();
    var lng = map.center.lng();

    var data = getAddressFromLatLng(lat, lng);
    
    if (data != null) {
	    data.then(response => {
	    	var loadingBar = document.getElementById("loading-bar");
			loadingBar.style.visibility = "visible";
			console.log(loadingBar);
			document.getElementById('wiki_iframe').src = "";

	    	var results = response.results;
	    	var wikiQuery = getWikiQueryFromGeocodingResults(results);
	    	searchWikipedia(wikiQuery)
		    .then(function(response) {
		        var matchedPages = response.query.search;
		        if (matchedPages.length > 1) {
		        	var currentUrl = document.getElementById('wiki_iframe').src;
		        	var newUrl = "https://en.wikipedia.org/wiki/" + matchedPages[0].title.replace(/ /g,"_");

		        	if (currentUrl != newUrl) {
		        		document.getElementById('wiki_iframe').src = newUrl;
		        	}

		        	var loadingBar = document.getElementById("loading-bar");
					loadingBar.style.visibility = "hidden";
		        }
		    })
	    });
    }
  });
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

function getWikiQueryFromGeocodingResults(results) {
	var search_result = "";
	if (results.length > 1) {
		for (result of results) {
    		for (addrComponent of result.address_components) {
    			if (search_result == "") {
    					search_result = addrComponent.long_name;
    			}

    			for (locationType of addrComponent.types) {
    				console.log(addrComponent.long_name + " " + locationType);

    				if (locationType == "administrative_area_level_1") {
    					return addrComponent.long_name;
    				}
    			}
    		}
		}
	}
    return search_result;
}
function getAddressFromLatLng(lat, lng) {
    var geocodingLink = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyBm-lj_8Dm-mGESYObrzWGcVd1Siue4iYk`;

    return fetch(geocodingLink)
    	.then(response => {
    		return response.json();
    });
}