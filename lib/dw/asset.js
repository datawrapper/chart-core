const __assets = {};

function asset(id) {
    return __assets[id];
}

asset.register = function(id, lib) {
    __assets[id] = lib;
};

asset.has = function(id) {
    return __assets[id] !== undefined;
};

export default asset;
