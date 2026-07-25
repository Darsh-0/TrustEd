import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRouter } from './routes/auth.js'
import { transferRouter } from "./routes/transfer.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
	res.json({
		message: "API is running!"
	});
});

app.use('/auth', authRouter);
app.use('/', transferRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${5000}`);
});
