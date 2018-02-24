import createBrowserHistory from "history/createBrowserHistory";
import qs from "qs";
import { task, utils } from "mangojuice-core";
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

// Internal utils
function createYieldableHistory = (history) => {
  let resolve, buffer = [];
  const historyChangeHandler = (location) => {
    if (resolve) {
      resolve(location);
      resolve = null;
    } else {
      buffer.push(location);
    }
  };
  const next = () => {
    return new Promise(r => {
      if (buffer.length) {
        r(buffer.shift());
      } else {
        resolve = r;
      }
    });
  };
  history.listen(historyChangeHandler);
  return { next };
}

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
      task(this.subscribeToHistory)
    ];
  }

  update(msg) {
    if (msg.is(Messages.LocationChanged)) {
      return this.handleLocationChange(msg.location);
    } else if (msg.is(Messages.Push)) {
      return this.pushLocation(msg.route);
    } else if (msg.is(Messages.Replace)) {
      return this.replaceLocation(msg.route);
    }
  }

  *subscribeToHistory() {
    const { history, routes, request } = this;

    // Set default route on root path
    if (history) {
      const defaultRoute = routes.roots.find(
        x => x && x.routeId && x.config && x.config.default
      );
      if (defaultRoute && history.location.pathname === "/") {
        history.replace(defaultRoute.pattern + history.location.search);
      }
    }

    // Yield init location change
    const initLocation = request ? request.location : history.location;
    yield message(Messages.LocationChanged, initLocation);

    // Subscribe to history changes
    if (history) {
      const historyChannel = createYieldableHistory(history);
      while(true) {
        const nextLocation = await historyChannel.next();
        yield message(Messages.LocationChanged, nextLocation);
      }
    }
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

    return {
      query: qs.parse(search),
      params,
      active,
      leftRoutes,
      changedRoutes,
      appearedOnce
    };
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
