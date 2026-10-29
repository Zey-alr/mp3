var Task = require('../models/task');
var User = require('../models/user');
var mongoose = require('mongoose');

module.exports = function (router) {

    var tasksRoute = router.route('/tasks');

    tasksRoute.get(async function (req, res) {
        try {
            var where = {};
            var sort = {};
            var select = {};

            try {
                if (req.query.where) {
                    where = JSON.parse(req.query.where);
                }

                if (req.query.sort) {
                    sort = JSON.parse(req.query.sort);
                }

                if (req.query.select) {
                    select = JSON.parse(req.query.select);
                }
            } catch (err) {
                return res.status(400).json({
                    message: 'Invalid query parameter',
                    data: null
                });
            }

            var skip = 0;
            var limit = 100;

            if (req.query.skip !== undefined) {
                skip = Number(req.query.skip);

                if (!Number.isInteger(skip) || skip < 0) {
                    return res.status(400).json({
                        message: 'Invalid skip parameter',
                        data: null
                    });
                }
            }

            if (req.query.limit !== undefined) {
                limit = Number(req.query.limit);

                if (!Number.isInteger(limit) || limit < 0) {
                    return res.status(400).json({
                        message: 'Invalid limit parameter',
                        data: null
                    });
                }
            }

            if (req.query.count === 'true') {
                var count = await Task.countDocuments(where);

                return res.status(200).json({
                    message: 'OK',
                    data: count
                });
            }

            var tasks = await Task.find(where)
                .sort(sort)
                .select(select)
                .skip(skip)
                .limit(limit);

            res.status(200).json({
                message: 'OK',
                data: tasks
            });

        } catch (err) {
            res.status(500).json({
                message: 'Server error',
                data: null
            });
        }
    });


    tasksRoute.post(async function (req, res) {
        try {
            if (typeof req.body.name !== 'string' ||
                req.body.name.trim() === '' ||
                typeof req.body.deadline !== 'string') {

                return res.status(400).json({
                    message: 'Invalid name or deadline',
                    data: null
                });
            }

            if (isNaN(Date.parse(req.body.deadline))) {
                return res.status(400).json({
                    message: 'Invalid deadline',
                    data: null
                });
            }

            if (req.body.description !== undefined &&
                typeof req.body.description !== 'string') {

                return res.status(400).json({
                    message: 'Invalid description',
                    data: null
                });
            }

            if (req.body.completed !== undefined &&
                typeof req.body.completed !== 'boolean') {

                return res.status(400).json({
                    message: 'Invalid completed value',
                    data: null
                });
            }

            if (req.body.assignedUser !== undefined &&
                typeof req.body.assignedUser !== 'string') {

                return res.status(400).json({
                    message: 'Invalid assigned user',
                    data: null
                });
            }

            if (req.body.assignedUserName !== undefined &&
                typeof req.body.assignedUserName !== 'string') {

                return res.status(400).json({
                    message: 'Invalid assigned user name',
                    data: null
                });
            }

            var assignedUser = req.body.assignedUser || '';
            var assignedUserName = 'unassigned';
            var user = null;

            if (assignedUser !== '') {

                if (!mongoose.Types.ObjectId.isValid(assignedUser)) {
                    return res.status(400).json({
                        message: 'Invalid assigned user id',
                        data: null
                    });
                }

                user = await User.findById(assignedUser);

                if (!user) {
                    return res.status(404).json({
                        message: 'Assigned user not found',
                        data: null
                    });
                }

                if (req.body.assignedUserName !== undefined &&
                    req.body.assignedUserName !== user.name) {

                    return res.status(400).json({
                        message: 'Assigned user name does not match',
                        data: null
                    });
                }

                assignedUserName = user.name;

            } else if (req.body.assignedUserName !== undefined &&
                       req.body.assignedUserName !== 'unassigned') {

                return res.status(400).json({
                    message: 'Unassigned task must use unassigned as the user name',
                    data: null
                });
            }

            var task = new Task({
                name: req.body.name,
                description: req.body.description || '',
                deadline: req.body.deadline,
                completed: req.body.completed === true,
                assignedUser: assignedUser,
                assignedUserName: assignedUserName
            });

            await task.save();

            if (user && !task.completed) {
                if (!user.pendingTasks.includes(task._id.toString())) {
                    user.pendingTasks.push(task._id.toString());
                    await user.save();
                }
            }

            res.status(201).json({
                message: 'Task created successfully',
                data: task
            });

        } catch (err) {
            res.status(500).json({
                message: 'Server error',
                data: null
            });
        }
    });


    var taskRoute = router.route('/tasks/:id');


    taskRoute.get(async function (req, res) {
        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(404).json({
                    message: 'Task not found',
                    data: null
                });
            }

            var query = Task.findById(req.params.id);

            if (req.query.select) {
                try {
                    var select = JSON.parse(req.query.select);
                    query = query.select(select);
                } catch (err) {
                    return res.status(400).json({
                        message: 'Invalid select parameter',
                        data: null
                    });
                }
            }

            var task = await query;

            if (!task) {
                return res.status(404).json({
                    message: 'Task not found',
                    data: null
                });
            }

            res.status(200).json({
                message: 'OK',
                data: task
            });

        } catch (err) {
            res.status(500).json({
                message: 'Server error',
                data: null
            });
        }
    });


    taskRoute.put(async function (req, res) {
        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(404).json({
                    message: 'Task not found',
                    data: null
                });
            }

            var task = await Task.findById(req.params.id);

            if (!task) {
                return res.status(404).json({
                    message: 'Task not found',
                    data: null
                });
            }

            if (typeof req.body.name !== 'string' ||
                req.body.name.trim() === '' ||
                typeof req.body.deadline !== 'string') {

                return res.status(400).json({
                    message: 'Invalid name or deadline',
                    data: null
                });
            }

            if (isNaN(Date.parse(req.body.deadline))) {
                return res.status(400).json({
                    message: 'Invalid deadline',
                    data: null
                });
            }

            if (req.body.description !== undefined &&
                typeof req.body.description !== 'string') {

                return res.status(400).json({
                    message: 'Invalid description',
                    data: null
                });
            }

            if (req.body.completed !== undefined &&
                typeof req.body.completed !== 'boolean') {

                return res.status(400).json({
                    message: 'Invalid completed value',
                    data: null
                });
            }

            if (req.body.assignedUser !== undefined &&
                typeof req.body.assignedUser !== 'string') {

                return res.status(400).json({
                    message: 'Invalid assigned user',
                    data: null
                });
            }

            if (req.body.assignedUserName !== undefined &&
                typeof req.body.assignedUserName !== 'string') {

                return res.status(400).json({
                    message: 'Invalid assigned user name',
                    data: null
                });
            }

            var newAssignedUser = req.body.assignedUser || '';
            var newAssignedUserName = 'unassigned';
            var newUser = null;

            if (newAssignedUser !== '') {

                if (!mongoose.Types.ObjectId.isValid(newAssignedUser)) {
                    return res.status(400).json({
                        message: 'Invalid assigned user id',
                        data: null
                    });
                }

                newUser = await User.findById(newAssignedUser);

                if (!newUser) {
                    return res.status(404).json({
                        message: 'Assigned user not found',
                        data: null
                    });
                }

                if (req.body.assignedUserName !== undefined &&
                    req.body.assignedUserName !== newUser.name) {

                    return res.status(400).json({
                        message: 'Assigned user name does not match',
                        data: null
                    });
                }

                newAssignedUserName = newUser.name;

            } else if (req.body.assignedUserName !== undefined &&
                       req.body.assignedUserName !== 'unassigned') {

                return res.status(400).json({
                    message: 'Unassigned task must use unassigned as the user name',
                    data: null
                });
            }

            var oldAssignedUser = task.assignedUser;
            var completed = req.body.completed === true;

            if (oldAssignedUser !== '' &&
                oldAssignedUser !== newAssignedUser &&
                mongoose.Types.ObjectId.isValid(oldAssignedUser)) {

                var oldUser = await User.findById(oldAssignedUser);

                if (oldUser) {
                    oldUser.pendingTasks = oldUser.pendingTasks.filter(function (id) {
                        return id !== task._id.toString();
                    });

                    await oldUser.save();
                }
            }

            task.name = req.body.name;
            task.description = req.body.description || '';
            task.deadline = req.body.deadline;
            task.completed = completed;
            task.assignedUser = newAssignedUser;
            task.assignedUserName = newAssignedUserName;

            await task.save();

            if (newUser) {
                var taskId = task._id.toString();

                newUser.pendingTasks = newUser.pendingTasks.filter(function (id) {
                    return id !== taskId;
                });

                if (!task.completed) {
                    newUser.pendingTasks.push(taskId);
                }

                await newUser.save();
            }

            res.status(200).json({
                message: 'Task updated successfully',
                data: task
            });

        } catch (err) {
            res.status(500).json({
                message: 'Server error',
                data: null
            });
        }
    });


    taskRoute.delete(async function (req, res) {
        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(404).json({
                    message: 'Task not found',
                    data: null
                });
            }

            var task = await Task.findById(req.params.id);

            if (!task) {
                return res.status(404).json({
                    message: 'Task not found',
                    data: null
                });
            }

            if (task.assignedUser !== '' &&
                mongoose.Types.ObjectId.isValid(task.assignedUser)) {

                var user = await User.findById(task.assignedUser);

                if (user) {
                    user.pendingTasks = user.pendingTasks.filter(function (id) {
                        return id !== task._id.toString();
                    });

                    await user.save();
                }
            }

            await Task.findByIdAndDelete(req.params.id);

            res.status(204).send();

            

        } catch (err) {
            res.status(500).json({
                message: 'Server error',
                data: null
            });
        }
    });


    return router;
};