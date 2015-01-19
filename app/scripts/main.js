$(function () {
    $(document).foundation();

    $(document)
        .on('choose-genres', showGenres)
        .on('select-genre', function(event, genre) {
            onGenreSelect(genre)
        })

    var player,
        playlist = new Backbone.Collection([], { model: models.Song }),
        stack = gajus.Swing.Stack({
            isThrowOut: function(offset, element, confidence) {
                return confidence >= .5
            }
        }),


        Echonest = getEchonest(),
        Spotify = getSpotify(),
        AudioEngine = getAudioEngine();

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
        $('footer').text('Now Playing: ' + nextSong.get('artist') + " - " + nextSong.get('title')).show()
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

    function onEmptyGenre(genre) {
        $('#notice').html(new views.EmptyGenreView({ model: genre }).render().$el)
        $('body').addClass('showingNotice')
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

                    emptyStack()
                    if (songs.length > 0) {
                        addToStack(songs, window.views.SongCardView, {
                            onSelect: onSongSelect,
                            onIndecision: function() {
                                onEmptyGenre(genre)
                            }
                        })
                    } else {
                        onEmptyGenre(genre)
                    }
                })
            }
        })
    }

    function removeGenre(genre) {
        genres.remove(genre)
    }

    function showGenres() {
        emptyStack()
        addToStack(genres, window.views.GenreCardView, {
            onSelect: onGenreSelect,
            onDecline: removeGenre
        })
    }

    function emptyStack() {
        $('#stack .card').each(function() {
            var $card = $(this),
                card = $card.data('card')

            card.destroy()
            $card.remove()
        })
    }

    var STACK_LENGTH = 20;
    function addToStack(collection, cardView, callbacks) {
        $('body').removeClass('showingNotice')
        var $stack = $('#stack');

        var modelsToStack = collection.slice(0, STACK_LENGTH),
            modelsToWait = collection.slice(STACK_LENGTH)

        _.each(modelsToStack, function(model) {
            var view = new cardView({ model: model })
            $stack.append(view.render().$el)

            var card = stack.createCard(view.el)

            view.$el.data('card', card)

            card.on('throwoutleft', function (e) {
                if (typeof callbacks.onDecline == 'function') {
                    callbacks.onDecline(model)
                }
            });

            card.on('throwoutright', function(e) {
                if (typeof callbacks.onSelect == 'function') {
                    callbacks.onSelect(model)
                }
            })

            card.on('throwoutend', function(e) {
                card.destroy()
                view.$el.remove()
                view.remove()

                if (! $('.card').length) {
                    if (modelsToWait.length) {
                        addToStack(
                            new Backbone.Collection(modelsToWait, { model: collection.model }),
                            cardView,
                            callbacks
                        )
                    } else if (typeof callbacks.onIndecision == 'function') {
                        callbacks.onIndecision(model)
                    }
                }
            })
        });
    }

    $.ajaxSettings.traditional = true;
    $.ajaxSetup({ cache: false });

    Echonest.listGenres(function(genreJsons) {
        genres.reset(genreJsons)
        showGenres()
    })
});
