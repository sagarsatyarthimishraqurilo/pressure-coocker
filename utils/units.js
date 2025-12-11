// utils/units.js
// Base units chosen: grams (g) for weight, milliliters (ml) for volume, pcs for count
const UNIT_MAP = {
    // weight
    g:    { type: 'weight', base: 'g', factor: 1 },
    kg:   { type: 'weight', base: 'g', factor: 1000 },
    mg:   { type: 'weight', base: 'g', factor: 0.001 },
  
    // volume
    ml:   { type: 'volume', base: 'ml', factor: 1 },
    l:    { type: 'volume', base: 'ml', factor: 1000 },
  
    // count
    pcs:  { type: 'count', base: 'pcs', factor: 1 },
    piece:{ type: 'count', base: 'pcs', factor: 1 },
  };
  
  function isValidUnit(u) {
    return !!UNIT_MAP[u];
  }
  
  function getUnitInfo(u) {
    return UNIT_MAP[u];
  }
  
  // Convert quantity in given unit to base units (number)
  function toBase(quantity, unit) {
    const info = UNIT_MAP[unit];
    if (!info) throw new Error(`Unsupported unit: ${unit}`);
    return Number(quantity) * info.factor;
  }
  
  // Convert base quantity to target display unit
  function fromBase(baseQuantity, displayUnit) {
    const info = UNIT_MAP[displayUnit];
    if (!info) throw new Error(`Unsupported unit: ${displayUnit}`);
    return Number(baseQuantity) / info.factor;
  }
  
  module.exports = { UNIT_MAP, isValidUnit, getUnitInfo, toBase, fromBase };
  