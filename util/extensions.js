Array.prototype.first = function() {
    return this[0];
};
Array.prototype.last = function() {
    return this[this.length - 1];
};
String.prototype.startWith = function(prefix) {
    if (this.indexOf(prefix) === 0) return this;
    return `${prefix}${this}`;
};