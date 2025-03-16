const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
    taskName: { type: String, required: true },
    dueDate: { type: Date, required: true },
    priority: { type: String, required: true },
    reminder: { type: String, required: true },
    taskCompleted: { type: Boolean, default: false }, // ✅ Tracks task status
});

const projectSchema = new mongoose.Schema({
    projectId: { type: String, required: true }, // ✅ Unique identifier for each project
    projectName: { type: String, required: true }, // ✅ Project name is stored
    tasks: [taskSchema], // ✅ Each project contains multiple tasks
});

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true }, // ✅ Unique user identifier
    projects: [projectSchema], // ✅ Each user has multiple projects
});

const User = mongoose.model("User", userSchema);
module.exports = User;
