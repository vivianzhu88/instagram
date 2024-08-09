import express from 'express'

const isAuthenticated = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
) => {
    if (req.isAuthenticated()) {
        next() // Go to the next non-error-handling middleware
        return
    }
    // Providing a parameter means go to the next error handler
    res.status(400).json({ error: 'Must be logged in.' })
}

const isNotAuthenticated = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
) => {
    if (!req.isAuthenticated()) {
        next() // Go to the next non-error-handling middleware
        return
    }
    // Providing a parameter means go to the next error handler
    res.status(400).json({ error: 'Already logged in.' })
}

export { isAuthenticated, isNotAuthenticated }
