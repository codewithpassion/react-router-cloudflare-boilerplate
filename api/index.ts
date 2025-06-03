import { Hono } from "hono";
import type { AppType } from "../workers/types";

const app = new Hono<AppType>();
