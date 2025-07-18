import { Router } from 'express';
import {
    createTweet,
    deleteTweet,
    getUserTweets,
    getEveryTweet,
    updateTweet,
} from "../controllers/tweet.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();

router.use(verifyJWT).route("/").post(createTweet);
router.use(verifyJWT).route("/user/:userId").get(getUserTweets);
router.use(verifyJWT).route("/:tweetId").patch(updateTweet).delete(deleteTweet);
router.use(verifyJWT).route("/everytweet").get(getEveryTweet);

export default router