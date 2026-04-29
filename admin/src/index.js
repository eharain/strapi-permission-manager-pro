import pluginPkg from "../../package.json";
import pluginId from "./pluginId";
import PluginIcon from "./components/PluginIcon";

const name = pluginPkg.strapi.name;

export default {
  register(app) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: PluginIcon,
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: "Permission Manager Pro",
      },
      Component: async () => {
        const component = await import("./pages/App");
        return component;
      },
      permissions: [],
    });

    app.registerPlugin({
      id: pluginId,
      name,
    });
  },

  bootstrap() {},
};
