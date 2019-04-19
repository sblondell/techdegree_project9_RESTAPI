"use strict";

const express = require('express');
const router = express.Router();
const auth = require('basic-auth');
const bcryptjs = require('bcryptjs');

const Users = require('../models/models.js').Users;
const Courses = require('../models/models.js').Courses;


async function authenticateUser (req, res, next) {
    let message = null;

    // Strip the user's credentials from the Authorization header.
    const credentials = auth(req);

    // If the user's credentials are available...
    if (credentials) {
        // Attempt to retrieve the user from the data store by their username (i.e. the user's "key"
        // from the Authorization header).
        await Users.find({emailAddress: credentials.name}, (err, users) => {
            if (err){
                res.status(401).json({message : "User not found"});
            }else {
                const user = users.map(user => {
                    return bcryptjs.compareSync(credentials.pass, user.password) ? user : null;
                });
                if (user[0]) {
                    [req.currentUser] = user;
                    next();
                }else {
                    res.status(401).json({message : "Access denied"});
                }
            }
        });
    }else {
        res.status(401).json({message : "Authentication Header not found"});
    }
};



// GET request to /api/users
// returns the current authorized user; status: 200
router.get('/users', authenticateUser, (req, res) => {
    res.status(200).json(req.currentUser);
});

// POST request to /api/users
// creates a new user, then sets the Location Header to '/'; status: 201
router.post('/users', async (req, res, next) => {

    // Email validation and duplication check...
    if (/[a-z0-9]+@[a-z0-9]+\.[a-z0-9]{3}/i.test(req.emailAddress)) {
        Users.findOne({emailAddress: req.emailAddress}, (err, user) => {
            if (err) return next(err);
            if (user) {
                const error = new Error("Duplicate email address");

                error.status(400);
                next(error);
            }
        });
    }else {
        const error = new Error("Invalid email address");

        error.status(400);
        next(error);
    }

    req.body.password = bcryptjs.hashSync(req.body.password);
    const user = new Users(req.body);

    await user.save(err => {
        if (err) return next(err);
        res.status(201)
            .location('/')
            .redirect('/');
    });
});

// GET request to /api/courses
// returns a list of courses; status: 200
router.get('/courses', (req, res, next) => {
    Courses.find()
        .exec((err, courses) => {
        if (err) {
            return next(err);
        }else {
            res.status(200).json(courses);
        }
    });
});

// GET request to /api/courses/:id
// returns the course matched with the param id as well as the user matched with the course; status: 200
router.get('/courses/:id', (req, res, next) => {
    Courses.findById(req.params.id, (err, course) => {
        if (err) {
            return next(err);
        }else {
            if (!course) {
                res.status(404).json({message : "Course not found"});
            }else {
                Users.findById(course.user, (err, user) => {
                    if (err) {
                        return next(err);
                    }else {
                        res.status(200).json({user, course});
                    }
                });
            }
        }
    });
});

// POST request to /api/courses
// creates a course, then sets the Location Header to the new course; status: 201
router.post('/courses', authenticateUser, async (req, res, next) => {
    req.body.user = req.currentUser._id;
    const course = new Courses(req.body);

    await course.save(err => {
        if (err) return next(err);
        res.status(201)
            .location('/api/courses/' + course._id)
            .redirect('/api/courses/' + course._id);
    });
});

// PUT request to /api/courses/:id
// updates a course record; status: 204
router.put('/courses/:id', authenticateUser, async (req, res, next) => {
    Courses.findById(req.params.id, (err, course) => {
        if (err) return next(err);

        if (!course) {
            res.status(404).json({message : "Course not found"});
        }else {
            if (req.currentUser._id.toString() === course.user.toString()) { // Check to make sure the current user owns the course...
                req.body.title ? course.title = req.body.title : null;
                req.body.description ? course.description = req.body.description : null;
                req.body.estimatedTime ? course.estimatedTime = req.body.estimatedTime : null;
                req.body.materialsNeeded ? course.materialsNeeded = req.body.materialsNeeded : null;
                course.save(err => {
                    if (err) return next(err);
                    res.status(204).json();
                });
            }else {
                res.status(403).json();
            }
        }
    });
    // Courses.findOneAndUpdate({"_id" : req.params.id}, req.body, (err, course) => {
    //     if (err) return next(err);
    //     !course ?
    //         res.status(404).json({message : "Course not found"}) :
    //         res.status(204).json();
    // });
});

// DELETE request to /api/courses/:id
// deletes a course; status: 204
router.delete('/courses/:id', authenticateUser, (req, res, next) => {
    Courses.findById(req.params.id, (err, course) => {
        if (err) return next(err);

        if (!course) {
            res.status(404).json({message : "Course not found"});
        }else {
            if (req.currentUser._id.toString() === course.user.toString()) { // Check to make sure the current user owns the course...
                Courses.findOneAndDelete({"_id" : req.params.id}, err => {
                    if (err) return next(err);
                    res.status(204).json();
                });
            }else {
                res.status(403).json();
            }
        }
    });
});



module.exports = router;