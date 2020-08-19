import React from "react";
import ReactDOM from "react-dom";
import { Route, Link, BrowserRouter as Router, Switch } from "react-router-dom";

import App from "./App";
import IndividualPoster from "./pages/IndividualPoster";
import IndividualPosterNew from "./pages/IndividualPosterNew";
import TeamPoster from "./pages/TeamPoster";
import PhotoDay from "./pages/PhotoDay";
import Socks from "./pages/Socks";
import Notfound from "./pages/error/Notfound";

import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import "./assets/css/style.css";
import "./assets/css/demo.css";
import * as serviceWorker from "./serviceWorker";

const routing = (
  <Router basename="/product-builder-new">
    <Switch>
      <Route exact path="/" component={App} />
      <Route path="/team-poster" component={TeamPoster} />
      <Route path="/individual-poster" component={IndividualPoster} />
      <Route path="/individual-poster-new" component={IndividualPosterNew} />
      <Route path="/photo-day" component={PhotoDay} />
      <Route path="/socks" component={Socks} />
      <Route component={Notfound} />
    </Switch>
  </Router>
);

ReactDOM.render(routing, document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
