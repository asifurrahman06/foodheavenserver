const express = require("express");
const mongoose = require("mongoose");
const { ObjectId } = require("mongoose").Types;
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const nodemailer = require("nodemailer");
const UserModel = require("./models/Users");
const Food = require("./models/Foods"); // Import the Food model
const RiderIndex = require("./models/riderIndexModel");
const router = express.Router();

const app = express();
app.use(cors());
app.use(express.json());

async function connectToMongoDB() {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/FoodHaven", {
      useNewUrlParser: true,
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

// Call the async function to establish the MongoDB connection
connectToMongoDB();

app.use(bodyParser.json());
app.use("/uploads", express.static("uploads"));

// Food Upload part

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Ensure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

app.post("/upload", upload.single("foodPicture"), async (req, res) => {
  try {
    const {
      foodName,
      foodDescription,
      foodPrice,
      foodCategory,
      expectedDeliveryDateTime, // Add expected delivery date-time
      lastOrderDateTime, // Add last order date-time
      email, // Use email to associate food with a seller
    } = req.body;

    // Validate required fields
    if (
      !foodName ||
      !foodDescription ||
      !foodPrice ||
      !foodCategory ||
      !expectedDeliveryDateTime || // Check if expected delivery date-time is provided
      !lastOrderDateTime || // Check if last order date-time is provided
      !email
    ) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Create a new Food instance
    const food = new Food({
      foodName,
      foodDescription,
      foodPrice,
      foodPicture: req.file.path,
      foodCategory,
      expectedDeliveryDateTime, // Assign expected delivery date-time
      lastOrderDateTime, // Assign last order date-time
      confirmedOrders: [],
      email,
    });

    await food.save();
    res.status(201).json({ message: "Food data stored successfully!" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Error storing food data.", details: error.message });
  }
});

// Login Part

app.post("/logIn", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email: email });
    if (user) {
      if (user.password === password) {
        res.json({
          success: true,
          type: user.type, // Assuming 'type' field exists in your UserModel.
        });
      } else {
        res.json({
          success: false,
          message: "Password is not correct",
        });
      }
    } else {
      res.json({
        success: false,
        message: "You are not registered",
      });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Error during login." });
  }
});

// Signup part

app.post("/signUp", (req, res) => {
  UserModel.create(req.body)
    .then((users) => res.json(users))
    .catch((err) => res.json(err));
});

//Forget password part

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "foodheavenmist@gmail.com", // Your Gmail email address
    pass: "FoodHeaven@cse-21", // Your Gmail password
  },
});

app.post("/send-email", async (req, res) => {
  try {
    const { email } = req.body;
    // Send email
    await transporter.sendMail({
      from: "foodheavenmist@gmail.com", // Your Gmail email address
      to: email,
      subject: "Password Reset",
      text: "Your password reset link: ", // Reset password link
    });
    res.status(200).json({ message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Error sending email." });
  }
});

//Seller part

app.get("/seller/foods/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const foods = await Food.find({ email }); // Filter by the seller's email
    res.json(foods);
  } catch (error) {
    console.error("Error fetching food items:", error);
    res.status(500).json({ error: "Error fetching food items." });
  }
});

app.get("/seller/foods/:foodId", async (req, res) => {
  const { foodId } = req.params;
  try {
    const food = await Food.findById(foodId);
    if (food) {
      res.json(food.confirmedOrders);
    } else {
      res.status(404).json({ error: "Food item not found." });
    }
  } catch (error) {
    console.error("Error fetching food item:", error);
    res.status(500).json({ error: "Error fetching food item." });
  }
});

app.put("/seller/foods/:foodId", async (req, res) => {
  const { foodId } = req.params;
  const { foodName, foodDescription, foodPrice, foodCategory } = req.body;
  try {
    const food = await Food.findByIdAndUpdate(
      foodId,
      {
        foodName,
        foodDescription,
        foodPrice,
        foodCategory,
      },
      { new: true }
    );
    if (food) {
      res.json(food);
    } else {
      res.status(404).json({ error: "Food item not found." });
    }
  } catch (error) {
    console.error("Error updating food item:", error);
    res.status(500).json({ error: "Error updating food item." });
  }
});

app.get("/foods", async (req, res) => {
  try {
    const foods = await Food.find();
    res.json(foods);
  } catch (error) {
    console.error("Error fetching food items:", error);
    res.status(500).json({ error: "Error fetching food items." });
  }
});

app.get("/foods/:userEmail", async (req, res) => {
  try {
    // Get the userEmail parameter from the request
    const userEmail = req.params.userEmail;

    // Fetch user's area based on userEmail
    const user = await UserModel.findOne({ email: userEmail });
    const userArea = user ? user.area : null;

    // Fetch food items from the database
    const foods = await Food.find();

    // Filter food items to include only those with matching areas
    const foodsWithMatchingArea = await Promise.all(
      foods.map(async (food) => {
        // Find the seller's information using the email from UserModel
        const seller = await UserModel.findOne({ email: food.email });

        // Check if the seller's area matches the user's area
        if (seller && seller.area === userArea) {
          // Return an object with both food and seller's name
          return {
            food: food,
            sellerName: seller.name, // Assuming you have a name property in your UserModel schema
          };
        }
        return null; // If the areas don't match, return null
      })
    );

    // Remove null entries (items with non-matching areas)
    const filteredFoods = foodsWithMatchingArea.filter((food) => food !== null);

    res.json(filteredFoods);
  } catch (error) {
    console.error("Error fetching food items:", error);
    res.status(500).json({ error: "Error fetching food items." });
  }
});

app.get("/seller/orders/:foodId", async (req, res) => {
  const { foodId } = req.params;
  try {
    const users = await UserModel.find({
      "cartItems.foodId": foodId,
      "cartItems.confirmedOrder": true,
    });

    let orders = [];
    users.forEach((user) => {
      const userOrders = user.cartItems
        .filter(
          (item) => item.foodId === foodId && item.confirmedOrder === true
        )
        .map((item) => ({
          foodItem: {
            name: user.name, // User's name
            address: user.address, // User's address
            phoneNumber: user.phone, // User's phone number
            quantity: item.quantity, // Quantity of the specific food item
            foodPrice: item.foodPrice,
            foodId: item.foodId,
            sentToRider: item.sentToRider,
            _id: item._id,
            riderPhoneNumber: item.riderPhoneNumber, // ... properties from user and item ...
            confirmedDelivery: item.confirmedDelivery,
          },
          foodName: item.foodName,
        }));

      orders = [...orders, ...userOrders];
    });

    if (orders.length > 0) {
      res.json(orders);
    } else {
      res
        .status(404)
        .json({ error: "No confirmed orders for this food item." });
    }
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Error fetching orders." });
  }
});

app.get("/seller/dashboard", async (req, res) => {
  try {
    // Assume seller's ID is passed via query parameters
    const sellerId = req.query.sellerId;

    if (!sellerId) {
      return res.status(400).json({ error: "Seller ID is required" });
    }

    const foods = await Food.find({
      seller: mongoose.Types.ObjectId(sellerId),
    });

    res.json(foods);
  } catch (error) {
    console.error("Error fetching seller's menu items:", error);
    res.status(500).json({ error: "Error fetching seller's menu items." });
  }
});

async function getNextRiderIndex(area, ridersInArea) {
  try {
    let riderIndex = await RiderIndex.findOne({ area });

    if (!riderIndex) {
      riderIndex = new RiderIndex({ area, currentIndex: 0 });
    } else {
      // Use the length of ridersInArea to wrap the index
      riderIndex.currentIndex =
        (riderIndex.currentIndex + 1) % ridersInArea.length;
    }

    await riderIndex.save();

    return riderIndex.currentIndex;
  } catch (error) {
    console.error("Error getting next rider index:", error);
    throw error;
  }
}

const riderIndexes = {};

app.put("/assignOrderToRider/:_id", async (req, res) => {
  const { _id } = req.params;
  const { sellerEmail } = req.body; // Get seller's email from the request body

  try {
    // Retrieve seller's address from UserModel using the seller's email
    const seller = await UserModel.findOne({ email: sellerEmail });

    if (!seller) {
      return res.status(404).json({ error: "Seller not found." });
    }

    const sellerAddress = seller.address;
    const sellerArea = seller.area;
    const sellerPhone = seller.phone;

    const ridersInArea = await UserModel.find({
      area: sellerArea,
      type: "Rider",
      activeStatus: true,
    });

    if (ridersInArea.length === 0) {
      return res
        .status(404)
        .json({ error: "No available riders in the same area." });
    }

    // Use the async function that interacts with the database
    const nextRiderIndex = await getNextRiderIndex(sellerArea, ridersInArea);

    const user = await UserModel.findOne({
      "cartItems._id": _id,
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const cartItemIndex = user.cartItems.findIndex((item) => item._id == _id);

    // If cart item not found, return error
    if (cartItemIndex === -1) {
      return res.status(404).json({ error: "Cart item not found." });
    }

    // Update the cart item with the rider details
    user.cartItems[cartItemIndex].sentToRider = true;
    user.cartItems[cartItemIndex].sellerAddress = sellerAddress;
    user.cartItems[cartItemIndex].sellerPhone = sellerPhone;
    if (
      user.cartItems[cartItemIndex].riderPhoneNumber ===
      "Not assigned to rider yet"
    ) {
      user.cartItems[cartItemIndex].riderPhoneNumber =
        ridersInArea[nextRiderIndex].phone;
    }

    await user.save(); // Save the updated user to the database

    // Send a success response
    res.status(200).json({ message: "Order assigned to rider successfully." });
  } catch (error) {
    console.error("Error assigning order to rider:", error);
    res.status(500).json({ error: "Error assigning order to rider." });
  }
});

// Rider part

app.get("/api/rider/orders/:riderEmail", async (req, res) => {
  try {
    const riderEmail = req.params.riderEmail;
    const rider = await UserModel.findOne({ email: riderEmail }, "phone");

    if (!rider) {
      return res.status(404).json({ error: "Rider not found" });
    }

    const orders = await UserModel.aggregate([
      {
        $match: {
          "cartItems.riderPhoneNumber": rider.phone,
        },
      },
      {
        $unwind: "$cartItems",
      },
      {
        $match: {
          "cartItems.riderPhoneNumber": rider.phone,
        },
      },
      {
        $project: {
          _id: 0,
          orderId: "$cartItems._id",
          foodName: "$cartItems.foodName",
          quantity: "$cartItems.quantity",
          confirmedOrder: "$cartItems.confirmedOrder",
          sentToRider: "$cartItems.sentToRider",
          confirmedDelivery: "$cartItems.confirmedDelivery",
          customerName: "$name",
          customerAddress: "$address",
          customerPhone: "$phone",
          foodPrice: "$cartItems.foodPrice",
          sellerAddress: "$cartItems.sellerAddress",
          sellerPhone: "$cartItems.sellerPhone",
        },
      },
    ]);

    if (orders.length === 0) {
      return res.status(404).json({ error: "No orders found for this rider" });
    }

    res.json({ orders });
  } catch (error) {
    console.error("Error fetching orders for rider:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/rider/confirm-delivery", async (req, res) => {
  try {
    const { orderId } = req.body;

    // Update the confirmedDelivery field for the specific cart item
    const result = await UserModel.updateOne(
      { "cartItems._id": new ObjectId(orderId) },
      {
        $set: {
          "cartItems.$.confirmedDelivery": true,
        },
      }
    );

    if (result.nModified === 0) {
      return res
        .status(404)
        .json({ error: "Order not found or already confirmed" });
    }

    res.status(200).json({ message: "Delivery confirmed successfully" });
  } catch (error) {
    console.error("Error confirming delivery:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/rider/update-status", (req, res) => {
  const { email, activeStatus } = req.body;

  // Assuming UserModel is your user model
  UserModel.findOneAndUpdate({ email }, { activeStatus }, { new: true })
    .then((user) => {
      res.json({ message: "Active status updated", user });
    })
    .catch((err) => {
      res.status(500).send("Error updating active status");
    });
});

// Customer part

app.post("/addToCart", async (req, res) => {
  try {
    const {
      email,
      foodId,
      quantity,
      foodName,
      foodPicture,
      foodPrice,
      sellerName,
    } = req.body;

    // Find the user by their email
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Check if the item is already in the cart and if it is confirmed
    const existingUnconfirmedItem = user.cartItems.find(
      (item) => item.foodId === foodId && !item.confirmedOrder
    );
    const existingConfirmedItem = user.cartItems.find(
      (item) => item.foodId === foodId && item.confirmedOrder
    );

    // If the item is not in the cart, or it is only there as a confirmed order, add a new unconfirmed item
    if (!existingUnconfirmedItem) {
      user.cartItems.push({
        quantity,
        foodId,
        sellerName,
        foodName,
        foodPicture,
        foodPrice,
        confirmedOrder: false, // Assuming you have a confirmedOrder flag in your schema
        sentToRider: false,
        confirmedDelivery: false,
      });
    } else {
      // If there is an unconfirmed item, increase the quantity
      existingUnconfirmedItem.quantity += quantity;
    }

    // Save the updated user record
    await user.save();

    res.status(200).json({ message: "Item added to cart successfully." });
  } catch (error) {
    console.error("Error adding item to cart:", error);
    res.status(500).json({ error: "Error adding item to cart." });
  }
});

app.put("/confirmOrder/:_id", async (req, res) => {
  try {
    const { email, quantity } = req.body;
    const { _id } = req.params;

    console.log("_id:", _id); // Log the _id
    console.log("email:", email); // Log the email

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const cartItemIndex = user.cartItems.findIndex((item) => item._id == _id);

    // If cart item not found, return error
    if (cartItemIndex === -1) {
      return res.status(404).json({ error: "Cart item not found." });
    }

    // Update the cart item with the new quantity and confirmed status
    user.cartItems[cartItemIndex].confirmedOrder = true;

    await user.save();
    res.status(200).json({ message: "Order confirmed successfully." });
  } catch (error) {
    console.error("Error confirming order:", error);
    res.status(500).json({ error: "Error confirming order." });
  }
});

app.put("/confirmAllOrders/:email", async (req, res) => {
  try {
    const { email } = req.params;

    // Directly update all unconfirmed items in the user's cart
    const updateResult = await UserModel.updateOne(
      { email },
      { $set: { "cartItems.$[elem].confirmedOrder": true } },
      { arrayFilters: [{ "elem.confirmedOrder": false }] }
    );

    if (updateResult.nModified === 0) {
      return res
        .status(200)
        .json({ message: "No unconfirmed orders to confirm." });
    }

    res.status(200).json({ message: "All orders confirmed successfully." });
  } catch (error) {
    console.error("Error confirming all orders:", error);
    res.status(500).json({ error: "Error confirming all orders." });
  }
});

app.get("/cart/:email", async (req, res) => {
  try {
    const { email } = req.params;

    // Find the user by their email
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Return the user's cart items
    res.json(user.cartItems);
  } catch (error) {
    console.error("Error fetching cart items:", error);
    res.status(500).json({ error: "Error fetching cart items." });
  }
});

app.delete("/removeFromCart/:_id", async (req, res) => {
  try {
    const { email } = req.body;
    const { _id } = req.params;

    // Find the user by their email
    const user = await UserModel.findOne({ email });

    // Error if user not found
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Remove the cart item from the user's cartItems array using MongoDB's $pull operator
    const updateResult = await UserModel.updateOne(
      { email },
      { $pull: { cartItems: { _id: _id } } }
    );

    // If nothing was modified, the item was not found
    if (updateResult.modifiedCount === 0) {
      return res
        .status(404)
        .json({ error: "Cart item not found or already removed." });
    }

    // Successfully removed the item
    res.status(200).json({ message: "Item removed from cart successfully." });
  } catch (error) {
    // Handle any errors during the operation
    console.error("Error removing item from cart:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/handleIncreaseDecrease/:_id", async (req, res) => {
  try {
    const { email, quantity } = req.body;
    const { _id } = req.params;

    // Validate quantity: Ensure it's a non-negative integer
    if (!Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({ error: "Invalid quantity." });
    }

    // Find the user by email
    const user = await UserModel.findOne({ email });

    // If user not found, return error
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Find the cart item index by _id
    const cartItemIndex = user.cartItems.findIndex((item) => item._id == _id);

    // If cart item not found, return error
    if (cartItemIndex === -1) {
      return res.status(404).json({ error: "Cart item not found." });
    }

    // Update the cart item with the new quantity
    user.cartItems[cartItemIndex].quantity = quantity;

    // Save the updated user object
    await user.save();

    // Send success response
    res.status(200).json({ message: "Quantity updated successfully." });
  } catch (error) {
    console.error("Error handlequantity:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

//Updat Info

app.get("/user/:email", async (req, res) => {
  const { email } = req.params;

  try {
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user data" });
  }
});

// Update user information based on email
app.put("/user/update/:email", async (req, res) => {
  const { email } = req.params;
  const { name, address, phone, area } = req.body;

  try {
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = name;
    user.address = address;
    user.phone = phone;
    user.area = area;

    await user.save();

    res.json({ message: "User information updated successfully" });
  } catch (error) {
    console.error("Error updating user data:", error.message);
    res.status(500).json({ message: "Error updating user data" });
  }
});

app.listen(3001, () => {
  console.log("Connected");
});
