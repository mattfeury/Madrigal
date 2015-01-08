$(function () {
    $(document).foundation();

    var player,
        playlist = new Backbone.Collection([], { model: models.Song }),

        Echonest = getEchonest(),
        Spotify = getSpotify(),
        AudioEngine = getAudioEngine();

    window.stack = undefined;

    var genres = new (Backbone.Collection.extend({
        model: window.models.Genre,
        comparator: function(a) { return Math.random() }
    }))([])

    function playNextSong() {
        var nextSong = playlist.shift()

        if (! nextSong) {
            return
        }

        AudioEngine.playUrl(nextSong.get('previewUrl'))
    }

    AudioEngine.onEnd(function() {
        playNextSong()
    })

    playlist.on('add', function() {
        if (AudioEngine.isPaused()) {
            playNextSong()
        }
    })

    function onSongSelect(song) {
        playlist.add(song)
    }

    function filterSongCollection(collection, prop) {
        return new Backbone.Collection(
            collection.filter(function(_) { return _.get(prop) }),
            { model: window.models.Song }
        )
    }

    function onGenreSelect(genre) {
        Echonest.getStaticGenrePlaylist({
            genre: genre.get('name'),
            callback: function(songJsons) {
                _.each(songJsons, window.models.Song.transformEchonestProps)

                var songs = new Backbone.Collection(songJsons, { model: window.models.Song })
                songs = filterSongCollection(songs, 'id')

                var spotifyIds = songs.pluck('id')
                Spotify.getTracks(spotifyIds, function(response) {
                    _.each(response.tracks, function(track) {
                        var song = songs.get(track.id)
                        song.setSpotifyTrackInfo(track)
                    })

                    songs = filterSongCollection(songs, 'previewUrl')

                    setupStack(songs, window.views.SongCardView, onSongSelect)
                })
            }
        })
    }

    function setupStack(collection, cardView, onSelectFn) {
        var $stack = $('#stack');
            stack = gajus.Swing.Stack({
                isThrowOut: function(offset, element, confidence) {
                    return confidence >= .5
                }
            });

        $stack.find('.card').each(function() {
            var $card = $(this),
                card = $card.data('card')

            card.throwOut(gajus.Swing.Card.DIRECTION_LEFT, Math.floor(Math.random() * 100 - 50));
        })

        collection.each(function(model) {
            var view = new cardView({ model: model })
            $stack.append(view.render().$el)

            var card = stack.createCard(view.el)

            view.$el.data('card', card)


            card.on('throwoutleft', function (e) {
                console.log(e.target.innerText || e.target.textContent, 'has been thrown out of the stack to the', e.throwDirection == 1 ? 'right' : 'left', 'direction.');
            });

            card.on('throwoutright', function(e) {
                console.log(e.target.innerText || e.target.textContent, 'has been thrown out of the stack to the', e.throwDirection == 1 ? 'right' : 'left', 'direction.');

                onSelectFn(model)
            })

            card.on('throwoutend', function(e) {
                card.destroy()
                view.$el.remove()
                view.remove()
            })
        });
    }

    $.ajaxSettings.traditional = true;
    $.ajaxSetup({ cache: true });

    Echonest.listGenres(function(genreJsons) {
        genres.reset(genreJsons)
        setupStack(genres, window.views.GenreCardView, onGenreSelect)
    })
});
