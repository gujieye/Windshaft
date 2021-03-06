require('../support/test_helper');

var assert = require('../support/assert');
var TestClient = require('../support/test_client');
var mapnik = require('@carto/mapnik');

describe('mvt (mapnik)', function () {
    mvtTest(false);
});

if (process.env.POSTGIS_VERSION >= '20400') {
    describe('mvt (pgsql)', function () {
        mvtTest(true);
    });
}

function mvtTest(usePostGIS) {
    const options = { mvt: { usePostGIS: usePostGIS } };
    it('single layer', function (done) {
        var mapConfig = TestClient.singleLayerMapConfig('select * from test_table', null, null, 'name');
        var testClient = new TestClient(mapConfig, options);

        testClient.getTile(13, 4011, 3088, { layer: 'mapnik', format: 'mvt' }, function (err, mvtTile) {
            assert.ifError(err);

            var vectorTile = new mapnik.VectorTile(13, 4011, 3088);

            vectorTile.setData(mvtTile);
            assert.equal(vectorTile.painted(), true);
            assert.equal(vectorTile.empty(), false);

            var result = vectorTile.toJSON();
            assert.equal(result.length, 1);

            var layer0 = result[0];
            assert.equal(layer0.name, 'layer0');
            assert.equal(layer0.features.length, 5);

            var expectedNames = ['Hawai', 'El Estocolmo', 'El Rey del Tallarín', 'El Lacón', 'El Pico'];
            var names = layer0.features.map(function (f) {
                return f.properties.name;
            });
            assert.deepEqual(names, expectedNames);

            if (usePostGIS){
                assert.ok(layer0.features.every(feature => Object.keys(feature.properties).length === 1),
                        'Should have only the necessary columns');
            }

            done();
        });
    });

    it('should return tiles with column "name" defined in mapconfig', function (done) {
        const mapConfig = {
            version: '1.6.0',
            layers: [
                {
                    type: 'mapnik',
                    options: {
                        sql: 'select * from test_table limit 2',
                        columns: ['name']
                    }
                }
            ]
        };

        const testClient = new TestClient(mapConfig, options);
        testClient.getTile(13, 4011, 3088, { format: 'mvt'}, function (err, mvtTile) {
            assert.ifError(err);

            var vtile = new mapnik.VectorTile(13, 4011, 3088);
            vtile.setData(mvtTile);
            assert.equal(vtile.painted(), true);
            assert.equal(vtile.empty(), false);

            var result = vtile.toJSON();
            assert.equal(result.length, 1);

            var layer0 = result[0];
            assert.equal(layer0.name, 'layer0');
            assert.equal(layer0.features.length, 2);

            const numberOfRetrievedColumns = usePostGIS ? 1 : 3;

            assert.ok(
                layer0.features.every(feature => Object.keys(feature.properties).length === numberOfRetrievedColumns),
                `Should have only the necessary columns (${numberOfRetrievedColumns} properties)`
            );

            assert.ok(
                layer0.features.every(feature => typeof feature.properties.name === 'string'),
                'Should have the column "name" defined'
            );

            done();
        });
    });

    it('should return tiles with columns "name" & "address" defined in mapconfig', function (done) {
        const mapConfig = {
            version: '1.6.0',
            layers: [
                {
                    type: 'mapnik',
                    options: {
                        sql: 'select * from test_table limit 2',
                        columns: ['name', 'address']
                    }
                }
            ]
        };

        const testClient = new TestClient(mapConfig, options);
        testClient.getTile(13, 4011, 3088, { format: 'mvt'}, function (err, mvtTile) {
            assert.ifError(err);

            var vtile = new mapnik.VectorTile(13, 4011, 3088);
            vtile.setData(mvtTile);
            assert.equal(vtile.painted(), true);
            assert.equal(vtile.empty(), false);

            var result = vtile.toJSON();
            assert.equal(result.length, 1);

            var layer0 = result[0];
            assert.equal(layer0.name, 'layer0');
            assert.equal(layer0.features.length, 2);

            const numberOfRetrievedColumns = usePostGIS ? 2 : 3;

            assert.ok(
                layer0.features.every(feature => Object.keys(feature.properties).length === numberOfRetrievedColumns),
                `Should have only the necessary columns (${numberOfRetrievedColumns} properties)`
            );

            assert.ok(
                layer0.features.every(feature => typeof feature.properties.name === 'string'),
                'Should have the column "name" defined'
            );

            assert.ok(
                layer0.features.every(feature => typeof feature.properties.address === 'string'),
                'Should have the column "address" defined'
            );

            done();
        });
    });

    var multipleLayersMapConfig =  {
        version: '1.3.0',
        layers: [
            {
                type: 'mapnik',
                options: {
                    sql: 'select * from test_table limit 2',
                    cartocss: '#layer { marker-fill:red; marker-width:32; marker-allow-overlap:true; }',
                    cartocss_version: '2.3.0',
                    interactivity: ['name']
                }
            },
            {
                type: 'mapnik',
                options: {
                    sql: 'select * from test_table limit 3 offset 2',
                    cartocss: '#layer { marker-fill:blue; marker-allow-overlap:true; }',
                    cartocss_version: '2.3.0',
                    interactivity: ['name']
                }
            }
        ]
    };

    var mixedLayersMapConfig =  {
        version: '1.3.0',
        layers: [
            {
                type: 'plain',
                options: {
                    color: 'red',
                    interactivity: ['name']
                }
            },
            {
                type: 'mapnik',
                options: {
                    sql: 'select * from test_table limit 2',
                    cartocss: '#layer { marker-fill:red; marker-width:32; marker-allow-overlap:true; }',
                    cartocss_version: '2.3.0',
                    interactivity: ['name']
                }
            },
            {
                type: 'mapnik',
                options: {
                    sql: 'select * from test_table limit 3 offset 2',
                    cartocss: '#layer { marker-fill:blue; marker-allow-overlap:true; }',
                    cartocss_version: '2.3.0',
                    interactivity: ['name']
                }
            },
            {
                type: 'torque',
                options: {
                    sql: 'select * from test_table',
                    cartocss: [
                        'Map {',
                        ' -torque-frame-count:1;',
                        ' -torque-resolution:1;',
                        ' -torque-time-attribute:d;',
                        ' -torque-aggregation-function:"count(*)";',
                        '}',
                        '#layer { marker-fill:blue; }'
                    ].join('')
                }
            }
        ]
    };

    function multipleLayersValidation(done) {
        return function (err, mvtTile) {
            assert.ok(!err, err);

            var vtile = new mapnik.VectorTile(13, 4011, 3088);
            vtile.setData(mvtTile);
            assert.equal(vtile.painted(), true);
            assert.equal(vtile.empty(), false);

            var result = vtile.toJSON();
            assert.equal(result.length, 2);

            var layer0 = result[0];
            assert.equal(layer0.name, 'layer0');
            assert.equal(layer0.features.length, 2);

            var layer1 = result[1];
            assert.equal(layer1.name, 'layer1');
            assert.equal(layer1.features.length, 3);

            var layer0ExpectedNames = ['Hawai', 'El Estocolmo'];
            assert.deepEqual(layer0.features.map(function (f) {
                return f.properties.name;
            }), layer0ExpectedNames);
            var layer1ExpectedNames = ['El Rey del Tallarín', 'El Lacón', 'El Pico'];
            assert.deepEqual(layer1.features.map(function (f) {
                return f.properties.name;
            }), layer1ExpectedNames);

            if (usePostGIS){
                assert.ok(layer0.features.every(feature => Object.keys(feature.properties).length === 1),
                        'Should have only the necessary columns');
                assert.ok(layer1.features.every(feature => Object.keys(feature.properties).length === 1),
                        'Should have only the necessary columns');
            }

            done();
        };
    }

    it('multiple layers', function(done) {
        var testClient = new TestClient(multipleLayersMapConfig, options);
        testClient.getTile(13, 4011, 3088, { layer: 'mapnik', format: 'mvt'}, multipleLayersValidation(done));
    });

    it('multiple layers do not specify `mapnik` as layer, use undefined', function(done) {
        var testClient = new TestClient(multipleLayersMapConfig, options);
        testClient.getTile(13, 4011, 3088, { layer: undefined, format: 'mvt'}, multipleLayersValidation(done));
    });

    describe('multiple layers with other types', function() {

        it('happy case', function(done) {
            var testClient = new TestClient(mixedLayersMapConfig, options);
            testClient.getTile(13, 4011, 3088, { layer: 'mapnik', format: 'mvt'}, multipleLayersValidation(done));
        });

        it('invalid mvt layer', function(done) {
            var testClient = new TestClient(mixedLayersMapConfig, options);
            testClient.getTile(13, 4011, 3088, { layer: 0, format: 'mvt'}, function(err) {
                assert.ok(err);
                assert.equal(err.message, 'Unsupported format mvt');
                done();
            });
        });

        it('select one layer', function(done) {
            var testClient = new TestClient(mixedLayersMapConfig, options);
            testClient.getTile(13, 4011, 3088, { layer: 1, format: 'mvt'}, function (err, mvtTile) {
                assert.ok(!err, err);

                var vtile = new mapnik.VectorTile(13, 4011, 3088);
                vtile.setData(mvtTile);
                assert.equal(vtile.painted(), true);
                assert.equal(vtile.empty(), false);

                var result = vtile.toJSON();
                assert.equal(result.length, 1);

                var layer0 = result[0];
                assert.equal(layer0.name, 'layer0');
                assert.equal(layer0.features.length, 2);

                var layer0ExpectedNames = ['Hawai', 'El Estocolmo'];
                var names = layer0.features.map(function (f) { return f.properties.name; });
                assert.deepEqual(names, layer0ExpectedNames);

                if (usePostGIS){
                    assert.ok(layer0.features.every(feature => Object.keys(feature.properties).length === 1),
                            'Should have only the necessary columns');
                }

                done();
            });
        });

        it('select multiple mapnik layers', function(done) {
            var testClient = new TestClient(mixedLayersMapConfig, options);
            testClient.getTile(13, 4011, 3088, { layer: '1,2', format: 'mvt'}, multipleLayersValidation(done));
        });

        it('filter some mapnik layers', function(done) {
            var mapConfig =  {
                version: '1.3.0',
                layers: [
                    {
                        type: 'plain',
                        options: {
                            color: 'red'
                        }
                    },
                    {
                        type: 'mapnik',
                        options: {
                            sql: 'select * from test_table limit 2',
                            cartocss: '#layer { marker-fill:red; marker-width:32; marker-allow-overlap:true; }',
                            cartocss_version: '2.3.0',
                            interactivity: ['name']
                        }
                    },
                    {
                        type: 'mapnik',
                        options: {
                            sql: 'select * from test_table limit 3 offset 2',
                            cartocss: '#layer { marker-fill:blue; marker-allow-overlap:true; }',
                            cartocss_version: '2.3.0',
                            interactivity: ['name']
                        }
                    },
                    {
                        type: 'mapnik',
                        options: {
                            sql: 'select * from test_table',
                            cartocss: '#layer { marker-fill:red; marker-width:32; marker-allow-overlap:true; }',
                            cartocss_version: '2.3.0',
                            interactivity: ['name']
                        }
                    }
                ]
            };
            var testClient = new TestClient(mapConfig, options);
            testClient.getTile(13, 4011, 3088, { layer: '1,3', format: 'mvt'}, function (err, mvtTile) {
                assert.ok(!err, err);

                var vtile = new mapnik.VectorTile(13, 4011, 3088);
                vtile.setData(mvtTile);
                assert.equal(vtile.painted(), true);
                assert.equal(vtile.empty(), false);

                var result = vtile.toJSON();
                assert.equal(result.length, 2);

                var layer0 = result[0];
                assert.equal(layer0.name, 'layer0');
                assert.equal(layer0.features.length, 2);

                var layer1 = result[1];
                assert.equal(layer1.name, 'layer2');
                assert.equal(layer1.features.length, 5);

                var layer0ExpectedNames = ['Hawai', 'El Estocolmo'];
                assert.deepEqual(layer0.features.map(function (f) {
                    return f.properties.name;
                }), layer0ExpectedNames);

                var layer1ExpectedNames = ['Hawai', 'El Estocolmo', 'El Rey del Tallarín', 'El Lacón', 'El Pico'];
                assert.deepEqual(layer1.features.map(function (f) {
                    return f.properties.name;
                }), layer1ExpectedNames);

                if (usePostGIS){
                    assert.ok(layer0.features.every(feature => Object.keys(feature.properties).length === 1),
                            'Should have only the necessary columns');
                    assert.ok(layer1.features.every(feature => Object.keys(feature.properties).length === 1),
                            'Should have only the necessary columns');
                }

                done();
            });
        });

        //TODO test token substitution

        it('should be able to access layer names by layer id', function(done) {
            var mapConfig = {
                version: '1.3.0',
                layers: [
                    {
                        type: 'plain',
                        options: {
                            color: 'red'
                        }
                    },
                    {
                        id: "test-name",
                        type: 'mapnik',
                        options: {
                            sql: 'select * from test_table limit 2',
                            cartocss: '#layer { marker-fill:red; marker-width:32; marker-allow-overlap:true; }',
                            cartocss_version: '2.3.0',
                            interactivity: ['name']
                        }
                    },
                    {
                        type: 'mapnik',
                        options: {
                            sql: 'select * from test_table limit 3 offset 2',
                            cartocss: '#layer { marker-fill:blue; marker-allow-overlap:true; }',
                            cartocss_version: '2.3.0',
                            interactivity: ['name']
                        }
                    },
                    {
                        id: "test-name-top",
                        type: 'mapnik',
                        options: {
                            sql: 'select * from test_table',
                            cartocss: '#layer { marker-fill:red; marker-width:32; marker-allow-overlap:true; }',
                            cartocss_version: '2.3.0',
                            interactivity: ['name']
                        }
                    }
                ]
            };
            var testClient = new TestClient(mapConfig, options);
            testClient.getTile(13, 4011, 3088, { layer: 'mapnik', format: 'mvt'}, function (err, mvtTile) {
                assert.ok(!err, err);

                var vtile = new mapnik.VectorTile(13, 4011, 3088);
                vtile.setData(mvtTile);
                assert.equal(vtile.painted(), true);
                assert.equal(vtile.empty(), false);

                var result = vtile.toJSON();
                assert.equal(result.length, 3);

                var layer0 = result[0];
                assert.equal(layer0.name, 'test-name');
                assert.equal(layer0.features.length, 2);

                var layer1 = result[1];
                assert.equal(layer1.name, 'layer1');
                assert.equal(layer1.features.length, 3);

                var layer2 = result[2];
                assert.equal(layer2.name, 'test-name-top');
                assert.equal(layer2.features.length, 5);

                var layer0ExpectedNames = ['Hawai', 'El Estocolmo'];
                assert.deepEqual(layer0.features.map(function (f) {
                    return f.properties.name;
                }), layer0ExpectedNames);

                var layer1ExpectedNames = ['El Rey del Tallarín', 'El Lacón', 'El Pico'];
                assert.deepEqual(layer1.features.map(function (f) {
                    return f.properties.name;
                }), layer1ExpectedNames);

                var layer2ExpectedNames = ['Hawai', 'El Estocolmo', 'El Rey del Tallarín', 'El Lacón', 'El Pico'];
                assert.deepEqual(layer2.features.map(function (f) {
                    return f.properties.name;
                }), layer2ExpectedNames);

                if (usePostGIS){
                    assert.ok(layer0.features.every(feature => Object.keys(feature.properties).length === 1),
                            'Should have only the necessary columns');
                    assert.ok(layer1.features.every(feature => Object.keys(feature.properties).length === 1),
                            'Should have only the necessary columns');
                    assert.ok(layer2.features.every(feature => Object.keys(feature.properties).length === 1),
                            'Should have only the necessary columns');
                }

                done();
            });
        });
    });

}


describe('mvt_bug', function () {

    var SQL = [
        "SELECT 1 AS cartodb_id, ST_SetSRID(ST_MakePoint(-71.10434, 42.315),4326) AS the_geom, " +
                "FALSE as status2, 0 as data",

        "SELECT 1 AS cartodb_id, ST_SetSRID(ST_MakePoint(-71.10434, 42.315),4326) AS the_geom, " +
                "0 as data, FALSE as status2"
    ];
    const mapConfig = {
        version: '1.7.0',
        layers: [
            {
                type: 'cartodb',
                options: {
                }
            }
        ]
    };

    SQL.forEach(function(sql){
        it('bool and int iteration ' + sql, function (done) {
            mapConfig.layers[0].options.sql = sql;
            this.testClient = new TestClient(mapConfig);
            this.testClient.getTile(0, 0, 0, { format: 'mvt' }, function (err, mvtTile) {
                assert.ok(!err);

                var vtile = new mapnik.VectorTile(0, 0, 0);
                vtile.setData(mvtTile);
                var result = vtile.toJSON();

                var layer0 = result[0];
                assert.equal(layer0.features.length, 1);
                assert.strictEqual(layer0.features[0].properties.status2, false);
                assert.strictEqual(layer0.features[0].properties.data, 0);

                done();
            });
        });
    });
});
