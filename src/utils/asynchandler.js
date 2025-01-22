
const asynchandler = (fn) => (req, res, next) => {
    Promise.resolve(requesthandler(req, res, next)).catch((err)=>next(err));
};

export {asynchandler}