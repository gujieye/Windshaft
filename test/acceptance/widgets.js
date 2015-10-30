require('../support/test_helper');
var _ = require('underscore');

var assert        = require('../support/assert');
var TestClient = require('../support/test_client');

describe('widgets', function() {

    describe('lists', function() {

        var listsMapConfig = {
            version: '1.5.0',
            layers: [
                {
                    type: 'mapnik',
                    options: {
                        sql: 'select * from test_table',
                        cartocss: '#layer0 { marker-fill: red; marker-width: 10; }',
                        cartocss_version: '2.0.1',
                        widgets: {
                            places: {
                                type: 'list',
                                options: {
                                    columns: ['name', 'address']
                                }
                            }
                        }
                    }
                }
            ]
        };

        it('cannot be fetched from nonexistent list name', function(done) {
            var testClient = new TestClient(listsMapConfig);
            testClient.getWidget(0, 'nonexistent', function (err) {
                assert.ok(err);
                assert.equal(err.message, "Widget 'nonexistent' not found at layer 0");
                done();
            });
        });

        it('can be fetched from a valid list', function(done) {
            var testClient = new TestClient(listsMapConfig);
            testClient.getWidget(0, 'places', function (err, list) {
                assert.ok(!err, err);
                assert.ok(list);
                assert.equal(list.type, 'list');
                assert.equal(list.rows.length, 5);

                var expectedNames = ['Hawai', 'El Estocolmo', 'El Rey del Tallarín', 'El Lacón', 'El Pico'];
                var names = list.rows.map(function (item) {
                    return item.name;
                });
                assert.deepEqual(names, expectedNames);

                done();
            });
        });

    });

    describe('histograms', function() {

        var histogramsMapConfig = {
            version: '1.5.0',
            layers: [
                {
                    type: 'mapnik',
                    options: {
                        sql: 'select * from populated_places_simple_reduced',
                        cartocss: '#layer0 { marker-fill: red; marker-width: 10; }',
                        cartocss_version: '2.0.1',
                        widgets: {
                            scalerank: {
                                type: 'histogram',
                                options: {
                                    column: 'scalerank'
                                }
                            },
                            pop_max: {
                                type: 'histogram',
                                options: {
                                    column: 'pop_max'
                                }
                            }
                        }
                    }
                }
            ]
        };

        it('can be fetched from a valid histogram', function(done) {
            var testClient = new TestClient(histogramsMapConfig);
            testClient.getWidget(0, 'scalerank', function (err, histogram) {
                assert.ok(!err, err);
                assert.ok(histogram);
                assert.equal(histogram.type, 'histogram');
                validateHistogramBins(histogram);

                assert.ok(histogram.bins.length);

                assert.deepEqual(histogram.bins[0], { bin:0, start:1, end:1.9, min:1, max:1, freq:179 });

                done();
            });
        });

        it('can be fetched from a valid histogram', function(done) {
            var testClient = new TestClient(histogramsMapConfig);
            testClient.getWidget(0, 'pop_max', function (err, histogram) {
                assert.ok(!err, err);
                assert.ok(histogram);
                assert.equal(histogram.type, 'histogram');
                //validateHistogramBins(histogram);

                assert.ok(histogram.bins.length);

                assert.deepEqual(
                    histogram.bins[histogram.bins.length - 1],
                    { bin: 9, start: 32108400, end: 35676000, freq: 1, min: 35676000, max: 35676000 }
                );

                done();
            });
        });

        it('returns array with freq=0 entries for empty bins', function(done) {
            var histogram20binsMapConfig = {
                version: '1.5.0',
                layers: [
                    {
                        type: 'mapnik',
                        options: {
                            sql: 'select * from populated_places_simple_reduced',
                            cartocss: '#layer0 { marker-fill: red; marker-width: 10; }',
                            cartocss_version: '2.0.1',
                            widgets: {
                                pop_max: {
                                    type: 'histogram',
                                    options: {
                                        column: 'pop_max',
                                        bins: 20
                                    }
                                }
                            }
                        }
                    }
                ]
            };

            var testClient = new TestClient(histogram20binsMapConfig);
            testClient.getWidget(0, 'pop_max', function (err, histogram) {
                assert.ok(!err, err);
                assert.equal(histogram.type, 'histogram');
                //validateHistogramBins(histogram);

                assert.ok(histogram.bins.length);

                assert.deepEqual(
                    histogram.bins[histogram.bins.length - 1],
                    { bin: 19, start: 33892200, end: 35676000, freq: 1, min: 35676000, max: 35676000 }
                );

                var emptyBin = histogram.bins[18];
                assert.equal(emptyBin.freq, 0);
                assert.equal(emptyBin.bin, 18);

                done();
            });
        });

    });

    function validateHistogramBins(histogram) {
        var firstBin = histogram.bins[0];
        assert.equal(firstBin.min, firstBin.start,
            'First bin does not match min and start ' + JSON.stringify(_.pick(firstBin, 'min', 'start'))
        );
        var lastBin = histogram.bins[histogram.bins.length - 1];
        assert.equal(lastBin.max, lastBin.end,
            'Last bin does not match max and end ' + JSON.stringify(_.pick(firstBin, 'max', 'end'))
        );

        histogram.bins.forEach(function(bin) {
            if (bin.min !== void 0) {
                assert.ok(bin.start <= bin.min,
                    'Bin start bigger than bin min ' + JSON.stringify(_.pick(firstBin, 'min', 'start', 'bin'))
                );
            }
            if (bin.max !== void 0) {
                assert.ok(bin.end >= bin.max,
                    'Bin end smaller than bin max ' + JSON.stringify(_.pick(firstBin, 'max', 'end', 'bin'))
                );
            }
        });
    }


});
