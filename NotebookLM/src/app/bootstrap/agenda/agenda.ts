import Agenda from "agenda";
import { Collection } from "mongoose";

const agenda = new Agenda({
    db:{ address: process.env.MONGODB_URI as string , collection:'jobs'},
})

export default agenda;
