const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, required: true },
    senderModel: { type: String, required: true, enum: ['User', 'Professional'] },
    recipient: { type: mongoose.Schema.Types.ObjectId, required: true },
    recipientModel: { type: String, required: true, enum: ['User', 'Professional'] },
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
