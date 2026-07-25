import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { isAddress } from "ethers";
import { authRouter } from "./routes/auth.js";
import { transferRouter } from "./routes/transfer.js";
import {
    RegistryNotConfigured,
    getUniversity,
    isAccredited,
    listAccredited,
    registryConfig,
} from "./dao.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
    res.json({
        message: "API is running!",
        dao: registryConfig(),
    });
});

/// The accredited directory, straight from the DAO's UniversityRegistry.
app.get("/api/universities", async (_req, res) => {
    try {
        res.json({ universities: await listAccredited() });
    } catch (err) {
        sendError(res, err);
    }
});

/// A single institution's record — name, country, and the public key the DAO approved.
app.get("/api/universities/:address", async (req, res) => {
    const { address } = req.params;
    if (!isAddress(address)) {
        res.status(400).json({ error: "Invalid address" });
        return;
    }
    try {
        res.json(await getUniversity(address));
    } catch (err) {
        sendError(res, err);
    }
});

/// The gate consumers actually care about: may this address issue credentials?
app.get("/api/universities/:address/accredited", async (req, res) => {
    const { address } = req.params;
    if (!isAddress(address)) {
        res.status(400).json({ error: "Invalid address" });
        return;
    }
    try {
        res.json({ address, accredited: await isAccredited(address) });
    } catch (err) {
        sendError(res, err);
    }
});

function sendError(res: express.Response, err: unknown) {
    if (err instanceof RegistryNotConfigured) {
        res.status(503).json({ error: err.message });
        return;
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(502).json({ error: `DAO registry read failed: ${message}` });
}

app.use("/auth", authRouter);
app.use("/", transferRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
