const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    try {
        const { Doc } = require('./src/app/models/docSchema.ts') || mongoose.model('Doc');

        const doc = await Doc.findOne({userId: "69da80c821dcfe118e6ae03e", noteId: "69da813921dcfe118e6ae0af"});
        console.log("Found:", doc ? doc._id : "null");
    } catch (e) {
        console.error(e);
    }
  process.exit(0);
});
