const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema({
  foodName: String,
  foodDescription: String,
  foodPrice: Number,
  foodPicture: String,
  foodCategory: String,
  expectedDeliveryDateTime: String, // Add expected delivery date-time field
  lastOrderDateTime: String, // Add last order date-time field
  email: String,
});

const Food = mongoose.model("foods", foodSchema);

module.exports = Food;
