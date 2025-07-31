import React from "react";
import logo from "./logo.svg";
import "./App.css";

import { GlWorkshop } from "./components/cloned-component/GlWorkshop";
import Parent from "./components/cloned-component/Parent";

function App() {
    return (
        <div className="App">
            {/* <GlWorkshop /> */}
            <Parent />
        </div>
    );
}

export default App;
