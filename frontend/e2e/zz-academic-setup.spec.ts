import { test, expect, type Page } from "@playwright/test";
async function save(page:Page, endpoint:string){
  const response=page.waitForResponse(r=>r.url().endsWith(`/api/v1/${endpoint}/`) && r.request().method()==="POST");
  await page.getByRole("button",{name:"Create record"}).click();
  const result=await response;
  expect(result.status(),await result.text()).toBe(201);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  return result.json();
}
async function add(page:Page,path:string){await page.goto(`/${path}`);await page.getByRole("button",{name:"Add new"}).click();}
test("admin configures curriculum, batch and section and resumes saved institute setup",async({page})=>{
  await page.goto("/login");await page.getByLabel("Username").fill("college.admin");await page.getByLabel("Password",{exact:true}).fill("LearnTogether42!");await page.getByRole("button",{name:"Sign in",exact:true}).click();await expect(page.getByRole("button",{name:"Sign out"})).toBeVisible();
  const stamp=Date.now();
  await add(page,"programs");await page.getByRole("textbox",{name:"Name",exact:true}).fill(`Program ${stamp}`);await page.getByRole("spinbutton",{name:"Number of semesters / years"}).fill("4");const program=await save(page,"programs");
  await add(page,"courses");await page.getByRole("textbox",{name:"Name",exact:true}).fill(`Subject ${stamp}`);await page.getByRole("textbox",{name:"Course code"}).fill(`S${stamp}`);const subject=await save(page,"courses");expect(subject.credit_hours).toBeNull();
  await add(page,"curriculum");await page.getByRole("dialog").getByRole("combobox",{name:"Program / grade",exact:true}).selectOption(program.id);await page.getByRole("dialog").getByRole("combobox",{name:"Subject",exact:true}).selectOption(subject.id);await page.getByRole("spinbutton",{name:"Semester / year number"}).fill("2");await page.getByRole("checkbox",{name:/Required subject/}).uncheck();const mapping=await save(page,"curriculum");expect(mapping.required).toBe(false);
  const years=(await(await page.request.get("/api/v1/years/")).json()).results;
  await add(page,"batches");await page.getByRole("textbox",{name:"Name",exact:true}).fill(`Intake ${stamp}`);await page.getByRole("dialog").getByRole("combobox",{name:"Program / grade",exact:true}).selectOption(program.id);await page.getByRole("dialog").getByRole("combobox",{name:"Entry academic year",exact:true}).selectOption(years[0].id);const batch=await save(page,"batches");
  await add(page,"sections");await page.getByRole("textbox",{name:"Name",exact:true}).fill(`Section ${stamp}`);await page.getByRole("dialog").getByRole("combobox",{name:"Program / grade",exact:true}).selectOption(program.id);await page.getByRole("dialog").getByRole("combobox",{name:"Admission batch (optional)",exact:true}).selectOption(batch.id);await save(page,"sections");
  await page.goto("/institute-setup");await page.reload();await expect(page.getByRole("heading",{name:"Institute setup",exact:true})).toBeVisible();await expect(page.getByRole("progressbar")).toBeVisible();const data=await(await page.request.get("/api/v1/institute-setup/")).json();expect(data.steps.find((s:{key:string})=>s.key==="curriculum").complete).toBe(true);expect(data.steps.find((s:{key:string})=>s.key==="batches").complete).toBe(true);
  await expect(page.getByRole("navigation",{name:"Breadcrumb"})).toContainText("Institute setup");await expect(page.getByRole("navigation",{name:"Breadcrumb"})).not.toContainText("Page not found");
  await page.screenshot({path:"../docs/images/institute-setup-desktop.png",fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:"../docs/images/institute-setup-mobile.png",fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByRole("link",{name:"Open: Map subjects to program semesters or years"}).click();await expect(page.getByRole("cell",{name:program.name,exact:true})).toBeVisible();
});
