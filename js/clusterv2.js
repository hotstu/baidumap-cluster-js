/**
 * Created by hglf on 2017/7/13.
 */
function Cluster() {
    this.points = [];
    this.center = null;
}
Cluster.prototype = {
    addPoint: function (_point) {
        if (this.points.indexOf(_point) === -1) {
            this.points.push(_point);
        }
        this.center = null;
    },
    removePoint: function (_point) {
        var index;
        if ((index = this.points.indexOf(_point)) !== -1) {
            this.points.splice(index, 1);
        }
        this.center = null;
    },
    removeAllPoints: function () {
        this.points.length = 0;
        this.center = null;
    },
    getCenter: function () {
        if (this.center) {
            return this.center;
        } else {
            var ret = new BMap.Point(0, 0);
            for (var i = 0; i < this.points.length; i++) {
                ret.lat += this.points[i].lat;
                ret.lng += this.points[i].lng;
            }
            ret.lat /= this.points.length;
            ret.lng /= this.points.length;
            this.center = ret;
            return this.center;
        }
    }
};

function ClusterMgr() {
    this.points = [];
    this.clusters = [];

}

ClusterMgr.prototype = {
    //region Description
    init: function (BMap, _algorithm, _render) {
        this.map = BMap;
        this.algorithm = _algorithm;
        this.render = _render;
        var that = this;
        this.map.addEventListener("zoomend", function () {
            //console.log("zoomend, current zoom level:" + that.map.getZoom());
            that.refresh();
        });
        this.map.addEventListener("moveend", function () {
            that.reRender(that.clusters);
        })
    },
    refresh: function () {
        var newClusters = this.calClusters();
        this.reRender(newClusters);
        this.clusters = newClusters;
    },
    addPoint: function (_point) {
        if (this.points.indexOf(_point) === -1) {
            this.points.push(_point);
            this.refresh();
        }
    },

    calClusters: function (options) {
        return this.algorithm.compute(options);
    },

    reRender: function (newClusters, options) {
        this.render.compute(newClusters, options);
    }
};

/**
 * grid based clustering
 * @param mgr ClusterMgr
 * @constructor
 */
function GenericAlgorithm(mgr) {
    return {
        /**
         * grid based clustering
         * @param options
         * @returns {Array}
         */
        compute: function (options) {
            var GRID_SIZE = 256;
            var zoom = mgr.map.getZoom();
            var numCells = Math.ceil(256 * Math.pow(2, zoom) / GRID_SIZE);
            var projecton = SphericalMercatorProjection(numCells);
            var ret = [];
            var clustersMap = {};
            for (var i = 0; i < mgr.points.length; i++) {
                var obj = mgr.points[i];
                var p = projecton.toPixel(obj);
                var key = numCells * Math.floor(p.x) + Math.floor(p.y);
                //console.log(p, numCells, key);
                var cluster = clustersMap[key];
                if (!cluster) {
                    cluster = new Cluster();
                    cluster.addPoint(obj);
                    ret.push(cluster);
                    clustersMap[key] = cluster;
                } else {
                    cluster.addPoint(obj);
                }
            }
            return ret;
        }
        
    }
}

function GenericRender(mgr) {
    return {
        compute: function (clusters, options) {
            mgr.map.clearOverlays();
            var bounds = mgr.map.getBounds();
            for (var i = 0; i < clusters.length; i++) {
                var cluster = clusters[i];
                //console.log(cluster);
                if (cluster.points.length <= 1) {
                    for (var j = 0; j < cluster.points.length; j++) {

                        var obj = cluster.points[j];
                        if (bounds.containsPoint(obj)) {
                            mgr.map.addOverlay(new BMap.Marker(obj));
                        }
                    }
                } else {
                    var obj = cluster.getCenter();
                    if (bounds.containsPoint(obj)) {
                        var myIcon = new BMap.Icon("http://lbsyun.baidu.com/jsdemo/img/fox.gif", new BMap.Size(300,157));
                        mgr.map.addOverlay(new BMap.Marker(obj,{icon:myIcon}));
                    }

                }

            }
        }
    }

}

function SphericalMercatorProjection(worldwith) {

    return {
        toPixel: function (point) {
            var x = point.lng / 360 + .5;
            var siny = Math.sin(this.toRadians(point.lat));
            var y = 0.5 * Math.log((1 + siny) / (1 - siny)) / -(2 * Math.PI) + .5;

            return new BMap.Pixel(x * worldwith, y * worldwith);
        },
        toPoint: function (pixel) {
            var x = pixel.x / worldwith - 0.5;
            var lng = x * 360;

            var y = .5 - (pixel.y / worldwith);
            var lat = 90 - this.toDegrees(Math.atan(Math.exp(-y * 2 * Math.PI)) * 2);

            return new BMap.point(lng, lat);
        },
        toRadians: function(degrees)
        {
            return degrees * Math.PI / 180;
        },
        toDegrees: function (radians) {
            return radians * 180 / Math.PI;
        }
    }
}
