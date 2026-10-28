var User = require('../models/user');
var Task = require('../models/task');
var mongoose = require('mongoose');

module.exports = function (router) {

    var usersRoute = router.route('/users');


    usersRoute.get(async function (req, res) {
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
            var limit = 0;

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
                var count = await User.countDocuments(where);

                return res.status(200).json({
                    message: 'OK',
                    data: count
                });
            }

            var query = User.find(where)
                .sort(sort)
                .select(select)
                .skip(skip);

            if (limit > 0) {
                query = query.limit(limit);
            }

            var users = await query;

            res.status(200).json({
                message: 'OK',
                data: users
            });

        } catch (err) {
            res.status(500).json({
                message: 'Server error',
                data: null
            });
        }
    });


    usersRoute.post(async function (req, res) {
        try {
            if (typeof req.body.name !== 'string' ||
                req.body.name.trim() === '' ||
                typeof req.body.email !== 'string' ||
                req.body.email.trim() === '') {

                return res.status(400).json({
                    message: 'Invalid name or email',
                    data: null
                });
            }

            if (req.body.pendingTasks !== undefined &&
                !Array.isArray(req.body.pendingTasks)) {

                return res.status(400).json({
                    message: 'pendingTasks must be an array',
                    data: null
                });
            }

            var pendingTasks = req.body.pendingTasks || [];

            for (var i = 0; i < pendingTasks.length; i++) {
                if (typeof pendingTasks[i] !== 'string' ||
                    !mongoose.Types.ObjectId.isValid(pendingTasks[i])) {

                    return res.status(400).json({
                        message: 'Invalid task id',
                        data: null
                    });
                }
            }

            var existingUser = await User.findOne({
                email: req.body.email
            });

            if (existingUser) {
                return res.status(400).json({
                    message: 'A user with this email already exists',
                    data: null
                });
            }

            var tasks = [];

            for (var j = 0; j < pendingTasks.length; j++) {
                var task = await Task.findById(pendingTasks[j]);

                if (!task) {
                    return res.status(404).json({
                        message: 'Task not found',
                        data: null
                    });
                }

                if (task.completed) {
                    return res.status(400).json({
                        message: 'Completed task cannot be pending',
                        data: null
                    });
                }

                tasks.push(task);
            }

            var user = new User({
                name: req.body.name,
                email: req.body.email,
                pendingTasks: pendingTasks
            });

            await user.save();

            for (var k = 0; k < tasks.length; k++) {
                var currentTask = tasks[k];

                if (currentTask.assignedUser !== '' &&
                    currentTask.assignedUser !== user._id.toString() &&
                    mongoose.Types.ObjectId.isValid(currentTask.assignedUser)) {

                    var oldUser = await User.findById(currentTask.assignedUser);

                    if (oldUser) {
                        oldUser.pendingTasks =
                            oldUser.pendingTasks.filter(function (id) {
                                return id !== currentTask._id.toString();
                            });

                        await oldUser.save();
                    }
                }

                currentTask.assignedUser = user._id.toString();
                currentTask.assignedUserName = user.name;

                await currentTask.save();
            }

            res.status(201).json({
                message: 'User created successfully',
                data: user
            });

        } catch (err) {
            res.status(500).json({
                message: 'Server error',
                data: null
            });
        }
    });


    var userRoute = router.route('/users/:id');


    userRoute.get(async function (req, res) {
        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(404).json({
                    message: 'User not found',
                    data: null
                });
            }

            var query = User.findById(req.params.id);

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

            var user = await query;

            if (!user) {
                return res.status(404).json({
                    message: 'User not found',
                    data: null
                });
            }

            res.status(200).json({
                message: 'OK',
                data: user
            });

        } catch (err) {
            res.status(500).json({
                message: 'Server error',
                data: null
            });
        }
    });


    userRoute.put(async function (req, res) {
        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(404).json({
                    message: 'User not found',
                    data: null
                });
            }

            var user = await User.findById(req.params.id);

            if (!user) {
                return res.status(404).json({
                    message: 'User not found',
                    data: null
                });
            }

            if (typeof req.body.name !== 'string' ||
                req.body.name.trim() === '' ||
                typeof req.body.email !== 'string' ||
                req.body.email.trim() === '') {

                return res.status(400).json({
                    message: 'Invalid name or email',
                    data: null
                });
            }

            if (req.body.pendingTasks !== undefined &&
                !Array.isArray(req.body.pendingTasks)) {

                return res.status(400).json({
                    message: 'pendingTasks must be an array',
                    data: null
                });
            }

            var newPendingTasks = req.body.pendingTasks || [];

            for (var i = 0; i < newPendingTasks.length; i++) {
                if (typeof newPendingTasks[i] !== 'string' ||
                    !mongoose.Types.ObjectId.isValid(newPendingTasks[i])) {

                    return res.status(400).json({
                        message: 'Invalid task id',
                        data: null
                    });
                }
            }

            var duplicateEmail = await User.findOne({
                email: req.body.email,
                _id: { $ne: user._id }
            });

            if (duplicateEmail) {
                return res.status(400).json({
                    message: 'A user with this email already exists',
                    data: null
                });
            }

            var newTasks = [];

            for (var j = 0; j < newPendingTasks.length; j++) {
                var task = await Task.findById(newPendingTasks[j]);

                if (!task) {
                    return res.status(404).json({
                        message: 'Task not found',
                        data: null
                    });
                }

                if (task.completed) {
                    return res.status(400).json({
                        message: 'Completed task cannot be pending',
                        data: null
                    });
                }

                newTasks.push(task);
            }

            var oldPendingTasks = user.pendingTasks.slice();
            var userId = user._id.toString();

            for (var k = 0; k < oldPendingTasks.length; k++) {
                if (!newPendingTasks.includes(oldPendingTasks[k])) {
                    var removedTask = await Task.findById(oldPendingTasks[k]);

                    if (removedTask &&
                        removedTask.assignedUser === userId) {

                        removedTask.assignedUser = '';
                        removedTask.assignedUserName = 'unassigned';

                        await removedTask.save();
                    }
                }
            }

            for (var x = 0; x < newTasks.length; x++) {
                var currentTask = newTasks[x];

                if (currentTask.assignedUser !== '' &&
                    currentTask.assignedUser !== userId &&
                    mongoose.Types.ObjectId.isValid(currentTask.assignedUser)) {

                    var oldUser = await User.findById(
                        currentTask.assignedUser
                    );

                    if (oldUser) {
                        oldUser.pendingTasks =
                            oldUser.pendingTasks.filter(function (id) {
                                return id !== currentTask._id.toString();
                            });

                        await oldUser.save();
                    }
                }

                currentTask.assignedUser = userId;
                currentTask.assignedUserName = req.body.name;

                await currentTask.save();
            }

            /*
             * A completed task can remain assigned to this user even
             * though it is not in pendingTasks. If the user's name
             * changes, update those tasks too.
             */
            await Task.updateMany(
                {
                    assignedUser: userId,
                    completed: true
                },
                {
                    $set: {
                        assignedUserName: req.body.name
                    }
                }
            );

            user.name = req.body.name;
            user.email = req.body.email;
            user.pendingTasks = newPendingTasks;

            await user.save();

            res.status(200).json({
                message: 'User updated successfully',
                data: user
            });

        } catch (err) {
            res.status(500).json({
                message: 'Server error',
                data: null
            });
        }
    });


    userRoute.delete(async function (req, res) {
        try {
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(404).json({
                    message: 'User not found',
                    data: null
                });
            }

            var user = await User.findById(req.params.id);

            if (!user) {
                return res.status(404).json({
                    message: 'User not found',
                    data: null
                });
            }

            await Task.updateMany(
                {
                    assignedUser: user._id.toString()
                },
                {
                    $set: {
                        assignedUser: '',
                        assignedUserName: 'unassigned'
                    }
                }
            );

            await User.findByIdAndDelete(req.params.id);

            res.status(200).json({
                message: 'User deleted successfully',
                data: user
            });

        } catch (err) {
            res.status(500).json({
                message: 'Server error',
                data: null
            });
        }
    });


    return router;
};