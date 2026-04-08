import axios from "axios";

const axiosClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL}/api`,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json"
  },
  withCredentials: true
});

const axiosNextServer = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_WEB_URL}/api`,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json"
  }
});

const axiosClientN8N = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_N8N_API_URL}`,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json"
  },
});

export { axiosClient, axiosNextServer, axiosClientN8N };
