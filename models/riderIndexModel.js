const mongoose = require("mongoose");

const riderIndexSchema = new mongoose.Schema({
  area: String,
  currentIndex: Number,
  
});

const RiderIndex = mongoose.model("RiderIndex", riderIndexSchema);

module.exports = RiderIndex;
