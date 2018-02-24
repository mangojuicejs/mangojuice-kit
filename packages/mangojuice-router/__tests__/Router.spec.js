import { child, logicOf, procOf, message } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";
import createMemoryHistory from "history/createMemoryHistory";
import Router from "mangojuice-router";


const createSharedBlock = (rootRoutes, historyOpts = {}) => {
  return {
    Logic: class SharedBlock {
      create() {
        return {
          router: child(Router.Logic).create({
            routes: rootRoutes,
            createHistory: createMemoryHistory.bind(null, historyOpts)
          })
        };
      }
      update = jest.fn()
    }
  }
}

describe("Router basic usage cases", () => {
  const NewsRoutes = {
    All: Router.route('/'),
    Category: Router.route('/:category'),
  }
  const MainRoutes = {
    Articles: Router.route('/articles', null, { default: true }),
    News: Router.route('/news', NewsRoutes),
  }
  const DefaultRoutes = {
    Root: Router.route('/', null, { default: true }),
  }

  it("should activate default non root route", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commands } = await runWithTracking({ app: SharedBlock });

    expect(Router.isActive(app.model.router, MainRoutes.Articles)).toBeTruthy();
    expect(Router.isActive(app.model.router, MainRoutes.News)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.All)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.Category)).toBeFalsy();
  });

  it("should recognize nested route on startup", async () => {
    const SharedBlock = createSharedBlock(MainRoutes, { initialEntries: [ '/news/123' ] });
    const { app, commands } = await runWithTracking({ app: SharedBlock });

    expect(Router.isActive(app.model.router, MainRoutes.Articles)).toBeFalsy();
    expect(Router.isActive(app.model.router, MainRoutes.News)).toBeTruthy();
    expect(Router.isActive(app.model.router, NewsRoutes.All)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.Category)).toBeTruthy();
    expect(app.model.router.params).toEqual({ category: '123' });
  });

  it("should recognize not found route at root", async () => {
    const SharedBlock = createSharedBlock(MainRoutes, { initialEntries: [ '/some_page' ] });
    const { app, commands } = await runWithTracking({ app: SharedBlock });

    expect(Router.isActive(app.model.router, MainRoutes.Articles)).toBeFalsy();
    expect(Router.isActive(app.model.router, MainRoutes.News)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.All)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.Category)).toBeFalsy();
    expect(Router.isNotFound(app.model.router)).toBeTruthy();
  });

  it("should recognize not found route at nested level", async () => {
    const SharedBlock = createSharedBlock(MainRoutes, { initialEntries: [ '/news/category/123' ] });
    const { app, commands } = await runWithTracking({ app: SharedBlock });

    expect(Router.isActive(app.model.router, MainRoutes.Articles)).toBeFalsy();
    expect(Router.isActive(app.model.router, MainRoutes.News)).toBeTruthy();
    expect(Router.isActive(app.model.router, NewsRoutes.All)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.Category)).toBeFalsy();
    expect(Router.isNotFound(app.model.router)).toBeFalsy();
    expect(Router.isNotFound(app.model.router, NewsRoutes)).toBeTruthy();
  });

  it("should be able to change the route", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });

    await procOf(app.model.router).update(message(Router.Messages.Push, NewsRoutes.Category({ category: '321' })));

    expect(Router.isChanged(app.model.router, MainRoutes.News)).toBeTruthy();
    expect(Router.isChanged(app.model.router, NewsRoutes.Category)).toBeTruthy();
    expect(Router.isLeft(app.model.router, MainRoutes.Articles)).toBeTruthy();
    expect(Router.isActive(app.model.router, MainRoutes.Articles)).toBeFalsy();
    expect(Router.isActive(app.model.router, MainRoutes.News)).toBeTruthy();
    expect(Router.isActive(app.model.router, NewsRoutes.All)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.Category)).toBeTruthy();
    expect(app.model.router.params).toEqual({ category: '321' });
  });

  it("should provide a way to create a link", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });

    const route = NewsRoutes.Category({ category: '321' });
    const link = Router.link(app.model.router, route);

    expect(link).toMatchSnapshot();
  });

  it("should provide a way to create a link with command creator", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });

    const route = NewsRoutes.All();
    const link = Router.link(app.model.router, route);

    expect(link).toMatchSnapshot();
  });

  it("should keep search query on default route redirection", async () => {
    const SharedBlock = createSharedBlock(DefaultRoutes, { initialEntries: [ '/?utm_campaign=tbbe' ] });
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });

    expect(Router.isActive(app.model.router, DefaultRoutes.Root)).toBeTruthy();
    expect(app.model.router.query).toEqual({ utm_campaign: 'tbbe' });
  });

  it("should push new item to browser history", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });
    const history = logicOf(app.model.router).history;

    await procOf(app.model.router).update(message(Router.Messages.Push, NewsRoutes.Category({ category: '321' }, {a: '123'})));

    expect(history.length).toEqual(2);
    expect(history.entries[1].pathname).toEqual('/news/321');
    expect(history.entries[1].search).toEqual('?a=123');
  });

  it("should replace last item in browser history", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });
    const history = logicOf(app.model.router).history;

    await procOf(app.model.router).update(message(Router.Messages.Replace, NewsRoutes.Category({ category: '321' }, {a: '123'})));

    expect(history.length).toEqual(1);
    expect(history.entries[0].pathname).toEqual('/news/321');
    expect(history.entries[0].search).toEqual('?a=123');
  });

  it("should provide a way to navigate only query with keeping existing by default", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });
    const history = logicOf(app.model.router).history;

    await procOf(app.model.router).update(message(Router.Messages.Push, Router.Query({ a: '123' })));
    await procOf(app.model.router).update(message(Router.Messages.Push, Router.Query({ b: '321' })));
    await procOf(app.model.router).update(message(Router.Messages.Push, Router.Query({ c: '111' })));

    expect(history.length).toEqual(4);
    expect(history.entries[3].pathname).toEqual('/articles');
    expect(history.entries[3].search).toEqual('?a=123&b=321&c=111');
  });

  it("should provide a way replace query with new one", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });
    const history = logicOf(app.model.router).history;

    await procOf(app.model.router).update(message(Router.Messages.Push, Router.Query({ a: '123' })));
    await procOf(app.model.router).update(message(Router.Messages.Push, Router.Query({ b: '321' }, false)));
    await procOf(app.model.router).update(message(Router.Messages.Push, Router.Query({ c: '111' })));

    expect(history.length).toEqual(4);
    expect(history.entries[3].pathname).toEqual('/articles');
    expect(history.entries[3].search).toEqual('?b=321&c=111');
  });

  it("should allow only unique params in patterns", async () => {
    const WrongRoutes = {
      Articles: Router.route('/articles/:id'),
      News: Router.route('/news/:id'),
    }
    const SharedBlock = createSharedBlock(WrongRoutes);
    const { errors } = await runWithTracking({ app: SharedBlock, expectErrors: true });

    expect(errors).toMatchSnapshot();
  });

  it("should track params uniqueness in children", async () => {
    const WrongChildreRoutes = {
      Latest: Router.route('/latest/:id'),
    }
    const WrongRoutes = {
      Articles: Router.route('/articles/:id'),
      News: Router.route('/news/:newsId', WrongChildreRoutes),
    }
    const SharedBlock = createSharedBlock(WrongRoutes);
    const { errors } = await runWithTracking({ app: SharedBlock, expectErrors: true });

    expect(errors).toMatchSnapshot();
  });
});
