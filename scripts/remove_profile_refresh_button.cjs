const fs = require("fs");

const path = "app/(tabs)/profile.jsx";
let content = fs.readFileSync(path, "utf8");

const backup = `${path}.bak.remove_refresh_${Date.now()}`;
fs.copyFileSync(path, backup);

content = content.replace(
/\s*<TouchableOpacity\s+onPress=\{loadProfileData\}[\s\S]*?<Text className="text-secondary font-pbold">\s*Оновити прогрес\s*<\/Text>\s*<\/TouchableOpacity>/,
""
);

fs.writeFileSync(path, content, "utf8");

console.log("DONE removed refresh button");
console.log("Backup:", backup);
