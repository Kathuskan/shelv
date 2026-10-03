// Retired router. Active routes are assembled in app.js; do not mount this legacy API.
const router=require('express').Router();
router.use((_req,res)=>res.status(410).json({message:'This legacy endpoint has been replaced. Refresh the application.'}));
module.exports=router;
