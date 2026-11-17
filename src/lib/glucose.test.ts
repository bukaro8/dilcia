import {describe,it,expect} from "vitest";
import {classify} from "./glucose";
describe("objetivos orientativos",()=>{
 it("marca toda lectura inferior a 4 como hipoglucemia",()=>{expect(classify(3.9,"AFTER_LUNCH")).toBe("low");expect(classify(3.9,"FASTING")).toBe("low")});
 it("usa intervalos de ayuno y antes de cenar inclusivos",()=>{expect(classify(4,"FASTING")).toBe("in");expect(classify(7,"BEFORE_DINNER")).toBe("in");expect(classify(7.1,"FASTING")).toBe("high")});
 it("considera el límite posalmuerzo superior al objetivo",()=>{expect(classify(8.4,"AFTER_LUNCH")).toBe("in");expect(classify(8.5,"AFTER_LUNCH")).toBe("high")});
});
