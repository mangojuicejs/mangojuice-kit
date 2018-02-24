import createBrowserHistory from "history/createBrowserHistory";
import qs from "qs";
import { task, utils, message, procOf } from "mangojuice-core";
import { createRouteMaps, findFirstPath, createHref } from './Utils';
import * as Messages from './Messages';


// Types
export type Model = {
  params: { [key: string]: string },
  query: { [key: string]: string },
  active: { [key: string]: boolean },
  appearedOnce: { [key: string]: boolean },
  changedRoutes: { [key: string]: boolean },
  leftRoutes: { [key: string]: boolean }
};

/**
 * By given routes tree create a Router logic and returns it
 * @param  {Object} routesTree
 * @return {Object}
 */
class Router {
  create({ request, createHistory = createBrowserHistory, routes } = {}) {
    this.routes = createRouteMaps(routes);
    this.history = request ? null : createHistory();
    this.request = request;

    const initModel = {
      params: {},
      query: {},
      active: {},
      appearedOnce: {},
      changedRoutes: {},
      leftRoutes: {}
    };

    return [
      initModel,
      this.subscribeToHistory
    ];
  }

  update(msg) {
    if (msg.is(Messages.ChangeLocation)) {
      return this.handleLocationChange(msg.location);
    } else if (msg.is(Messages.Push)) {
      return this.pushLocation(msg.route);
    } else if (msg.is(Messages.Replace)) {
      return this.replaceLocation(msg.route);
    }
  }

  destroy() {
    if (this.stopHistoryListener) {
      this.stopHistoryListener();
    }
  }

  subscribeToHistory() {
    const { history, routes, request, model } = this;
    const historyListener = (location) =>
      procOf(model).update(message(Messages.ChangeLocation, location));

    // Set default route on root path
    if (history) {
      const defaultRoute = routes.roots.find(
        x => x && x.routeId && x.config && x.config.default
      );
      if (defaultRoute && history.location.pathname === "/") {
        history.replace(defaultRoute.pattern + history.location.search);
      }
      this.stopHistoryListener = history.listen(historyListener);
    }

    // Yield init location change
    const initLocation = request ? request.location : history.location;
    historyListener(initLocation);
  }

  handleLocationChange(location) {
    const firstPath = findFirstPath(this.routes, location.pathname);
    const active = {};
    const changedRoutes = {};
    const appearedOnce = { ...this.model.appearedOnce };

    if (firstPath) {
      firstPath.chain.forEach(x => {
        active[x] = true;
        changedRoutes[x] =
          (!this.model.active[x] && !this.model.changedRoutes[x]) || !this.handledOnce;
        if (appearedOnce[x] === undefined) {
          appearedOnce[x] = true;
        } else if (appearedOnce[x] === true) {
          appearedOnce[x] = false;
        }
      });
    }

    const leftRoutes = {};
    for (let k in this.model.active) {
      if (!active[k]) {
        leftRoutes[k] = true;
      }
    }

    this.handledOnce = true;
    const search = location.search.replace(/^\?(.*)/, "$1");
    const params = firstPath
      ? { ...this.model.params, ...firstPath.params }
      : this.model.params;

    return [
      {
        query: qs.parse(search),
        params,
        active,
        leftRoutes,
        changedRoutes,
        appearedOnce
      },
      message(Messages.LocationChanged, location)
    ];
  }

  pushLocation(route) {
    return this.changeHistory(route, { replace: false });
  }

  replaceLocation(route) {
    return this.changeHistory(route, { replace: true });
  }

  changeHistory(route, opts = {}) {
    const changeType = opts.replace ? "replace" : "push";
    const updateHistory = this.history[changeType];
    const nextUrl = createHref(this.model, this, route);
    updateHistory(nextUrl);
  }
}

export default Router;
