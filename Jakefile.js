const fs = require("fs");

const filename = "lib/index";
const namespace = "ScrollAgnosticTimeline";

task("dts", () => {
  const path = `${filename}.d.ts`;
  const dts = fs.readFileSync(path, "utf-8");
  fs.writeFileSync(path, dts + `export as namespace ${namespace};\n`);
});

task("js", () => {
  const path = `${filename}.js`;
  const js = fs.readFileSync(path, "utf-8");
  const injected = js
    .replace("function (factory)", "function (global, factory)")
    .replace("})(function (require, exports) {", `    else {
        global.${namespace} = global.${namespace} || {};
        var exports = global.${namespace};
        factory(global.require, exports);
    }
})(this, function (require, exports) {`);
  fs.writeFileSync(path, injected);
});

task("jsmap", () => {
  const path = `${filename}.js.map`;
  const jsmap = fs.readFileSync(path, "utf-8");
  const marker = '"mappings":"';
  const index = jsmap.indexOf(marker) + marker.length;
  const injected = `${jsmap.slice(0, index)};;;;;${jsmap.slice(index)}`;
  fs.writeFileSync(path, injected);
});

/**
 * Promisify jake.exec
 * @param {string[]} cmds 
 */
function asyncExec(cmds) {
  return new Promise(resolve => {
    jake.exec(cmds, { printStdout: true, printStderr: true }, resolve);
  });
}

task("tsc", () => asyncExec(["tsc"]))

task("default", ["tsc", "dts", "js", "jsmap"]);
