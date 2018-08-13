Array.prototype.first = function() {
    return this[0];
};
Array.prototype.last = function() {
    return this[this.length - 1];
};
Array.prototype.remove = function(item) {
    const index = this.indexOf(item);
    return index !== -1 ? this.splice(index, 1) : null;
};
String.prototype.startWith = function(prefix) {
    if (this.indexOf(prefix) === 0) return this;
    return `${prefix}${this}`;
};