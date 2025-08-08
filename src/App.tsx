import React from "react";
import "./App.css";
import Wrapper from "./components/confetti/wrapper";
import { GlWorkshop } from "./components/cloned-component/GlWorkshop";
// import { CardAnimation } from "./components/card-animation";

function App() {
    return (
        <div className="App">
            <GlWorkshop />
            {/* <Wrapper /> */}
        </div>
    );
}

export default App;
