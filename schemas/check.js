
module.exports = function(mongoose) {
	
	var Schema = mongoose.Schema;

	var checkSchema = new Schema({
		steamid: String,
		used: {type: Boolean, default: false },
		ignore: { type: Boolean, default: false },
		yes: { type: Boolean, default: false },
		time: { type: Date, default: Date.now },
		name: String
	});
		
	return mongoose.model('check', checkSchema);
}