function getEchonest() {
    var host = 'http://developer.echonest.com/api/v4/',
        apiKey =  'JMR2E8WCUFYOSVGN9';

    var listGenres = function(callback) {
        var url = host + "genre/list";

        $.getJSON(url, {
            api_key: apiKey,
            results: 2000,
            bucket: ["description"]
        }, function(data) {
            callback(data.response.genres)
        });
    }

    var GenrePlaylistPresets = {
        CORE_BEST: "core-best",
        CORE_SHUFFLED: "core-shuffled",
        IN_ROTATION_BEST: "in_rotation-best",
        IN_ROTATION_SHUFFLED: "in_rotation-shuffled",
        EMERGING_BEST: "emerging-best",
        EMERGING_SHUFFLED: "emerging-shuffled"
    };

    // http://developer.echonest.com/docs/v4/premium.html
    var getStaticGenrePlaylist = function(options) {
        var url = host + 'playlist/static';

        _.defaults(options, {
            genre: "Chillwave",
            preset: GenrePlaylistPresets.CORE_SHUFFLED,
            results: 50 // This is spotify's max
        })

        $.getJSON(url, {
            api_key: apiKey,
            bucket: ['tracks', 'id:spotify-WW'],
            limit: true,
            type: "genre-radio", 
            results: options.results,
            genre_preset: options.preset,
            genre: options.genre
        }, function(data) {
            options.callback(data.response.songs)
        });
    }

    return {
        listGenres: listGenres,
        getStaticGenrePlaylist: getStaticGenrePlaylist,
        GenrePlaylistPresets: GenrePlaylistPresets
    }
}
