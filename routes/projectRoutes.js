const express = require("express");
const crypto = require("crypto");
const User = require("../models/User");

const router = express.Router();

// ✅ Generate Unique User ID for New Users
router.get("/setup", async (req, res) => {
    const userId = crypto.randomUUID();
    console.log(userId)
    // Check if user already exists
    let user = await User.findOne({ userId });
    if (!user) {
        user = new User({ userId, projects: [] });
        await user.save();
    }

    res.json({ userId });
});

router.post("/project", async (req, res, next) => {
    try {
        const { userId, projectName } = req.body;

        const projectId = crypto.randomUUID(); // Generate unique project ID
        const newProject = { projectId, projectName, tasks: [] };

        // ✅ Add the new project to the user
        await User.findOneAndUpdate(
            { userId },
            { $push: { projects: newProject } },
            { new: true, upsert: true }
        );

        // ✅ Forward request to `GET /projects/:userId` to return updated projects
        res.redirect(`/api/projects/${userId}`);
    } catch (error) {
        next(error); // ✅ Pass error to Express error handler
    }
});


// ✅ Get Only Project IDs & Names for a User
router.get("/projects/:userId", async (req, res) => {
    try {
        const user = await User.findOne(
            { userId: req.params.userId },
            { "projects.projectId": 1, "projects.projectName": 1, _id: 0 } // ✅ Select only these fields
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user.projects); // ✅ Directly return filtered projects
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});



// ✅ Add a Task to a Specific Project
router.post("/task", async (req, res) => {
    const { userId, projectId, task } = req.body;

    await User.findOneAndUpdate(
        { userId, "projects.projectId": projectId },
        { $push: { "projects.$.tasks": task } }, // ✅ Push task into correct project
        { new: true }
    );

    res.json({message:"added successfully"});
});

// ✅ Update a Task (Change Task Status or Details)
router.patch("/task", async (req, res) => {
    const { userId, projectId, taskId, updatedFields } = req.body;

    const updatedUser = await User.findOneAndUpdate(
        { userId, "projects.projectId": projectId, "projects.tasks._id": taskId },
        { $set: { "projects.$[].tasks.$[task]": { _id: taskId, ...updatedFields } } },
        { arrayFilters: [{ "task._id": taskId }], new: true }
    );

    res.json(updatedUser);
});

// ✅ Delete Multiple Tasks from a Specific Project
router.delete("/projects/:projectId", async (req, res) => {
    try {
        const { projectId } = req.params;
        const { tasks: taskIds } = req.body; // Extract task IDs from request body

        if (!taskIds || !Array.isArray(taskIds)) {
            return res.status(400).json({ message: "Invalid request data" });
        }

        // ✅ Find the user who owns the project
        const user = await User.findOne({ "projects.projectId": projectId });

        if (!user) {
            return res.status(404).json({ message: "Project not found" });
        }

        // ✅ Find the specific project
        const project = user.projects.find(p => p.projectId === projectId);

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }


        // ✅ Convert `_id` and `taskIds` to strings for proper comparison
        const taskIdsToDelete = taskIds.map(id => String(id));

        project.tasks = project.tasks.filter(task => !taskIdsToDelete.includes(String(task._id)));

        // ✅ Mark project as modified
        user.markModified("projects");

        // ✅ Save the updated user document
        await user.save();

        res.json({ message: "Tasks deleted successfully", project });
    } catch (error) {
        console.error("Error deleting tasks:", error);
        res.status(500).json({ message: "Error deleting tasks", error });
    }
});

router.get("/projects/:projectId/tasks", async (req, res) => {
    try {
        const { projectId } = req.params;

        // ✅ Find the user who owns this project
        const user = await User.findOne({ "projects.projectId": projectId });

        if (!user) {
            return res.status(404).json({ message: "Project not found" });
        }

        // ✅ Find the project in user's projects array
        const project = user.projects.find(p => p.projectId === projectId);

        if (!project) {
            return res.status(404).json({ message: "Project not found " });
        }

        res.json(project.tasks); // ✅ Return only the tasks of this project
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});
// ✅ Delete a Project for a User
router.delete("/project", async (req, res) => {
    try {
        const { userId, projectId } = req.body;

        if (!userId || !projectId) {
            return res.status(400).json({ message: "Missing userId or projectId" });
        }

        // ✅ Find the user
        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // ✅ Remove the project with the matching projectId
        user.projects = user.projects.filter(project => project.projectId !== projectId);

        // ✅ Mark the projects field as modified
        user.markModified("projects");

        // ✅ Save the updated user document
        await user.save();

        // ✅ Return the updated project list
        res.json(user.projects.map(({ projectId, projectName }) => ({ projectId, projectName })));
    } catch (error) {
        console.error("Error deleting project:", error);
        res.status(500).json({ message: "Error deleting project", error });
    }
});
module.exports = router;
