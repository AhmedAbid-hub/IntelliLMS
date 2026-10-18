import {test,expect,type Page} from "@playwright/test";
async function login(page:Page,user:string){await page.goto("/login");await page.getByLabel("Username").fill(user);await page.getByLabel("Password",{exact:true}).fill("LearnTogether42!");await page.getByRole("button",{name:"Sign in",exact:true}).click();await expect(page.getByRole("button",{name:"Sign out"})).toBeVisible();}
async function post(page:Page,path:string,data:unknown){const csrf=(await page.context().cookies()).find(c=>c.name==="csrftoken")!.value;const response=await page.request.post(`/api/v1/${path}/`,{data,headers:{"X-CSRFToken":csrf}});expect(response.ok(),await response.text()).toBe(true);return response.json();}
test("admin finalizes a grade, teacher requests a correction and independent approval preserves its audit",async({page})=>{
 await login(page,"university.teacher");const course=(await(await page.request.get("/api/v1/offerings/")).json()).results[0];const enrollment=(await(await page.request.get(`/api/v1/enrollments/?offering=${course.id}&active=true`)).json()).results[0];const title=`Reviewed exam ${Date.now()}`;
 const grade=await post(page,"manual-grades",{offering:course.id,student:enrollment.student,title,marks:40,max_marks:100,released:true});await page.getByRole("button",{name:"Sign out"}).click();
 await login(page,"university.admin");await page.goto(`/manual-grades?offering=${course.id}`);await expect(page.getByRole("button",{name:"Add new",exact:true})).toHaveCount(0);await expect(page.getByRole("button",{name:`Edit ${title}`,exact:true})).toHaveCount(0);const row=page.getByRole("row").filter({hasText:title});await row.getByRole("button",{name:"Request correction",exact:true}).click();await page.getByLabel("Reason for this academic action").fill("Exam board approved final grade");await page.getByRole("button",{name:"Finalize record"}).click();await expect(page.getByRole("status")).toContainText("Record finalized");await page.getByRole("button",{name:"Close dialog"}).click();await page.getByRole("button",{name:"Sign out"}).click();
 await login(page,"university.teacher");await page.goto(`/manual-grades?offering=${course.id}`);await page.getByRole("row").filter({hasText:title}).getByRole("button",{name:"Request correction",exact:true}).click();await expect(page.getByText(/Ordinary edits are locked/)).toBeVisible();await expect(page.getByRole("button",{name:"Reopen record with reason"})).toHaveCount(0);await page.getByLabel("Proposed marks").fill("55.50");await page.getByLabel("Reason for this academic action").fill(`Verified scoring error ${title}`);await page.getByRole("dialog").getByRole("button",{name:"Request correction",exact:true}).click();await expect(page.getByRole("status")).toContainText("Correction requested");expect((await(await page.request.get(`/api/v1/manual-grades/${grade.id}/`)).json()).marks).toBe("40.00");await page.getByRole("button",{name:"Close dialog"}).click();await page.getByRole("button",{name:"Sign out"}).click();
 await login(page,"university.admin");await page.goto("/notifications");const notice=page.getByRole("row").filter({hasText:`Verified scoring error ${title}`});await expect(notice.getByRole("link",{name:"Open notification"})).toHaveAttribute("href","/academic-reviews");await notice.getByRole("button",{name:"Mark read"}).click();await expect(notice.getByRole("button",{name:"Mark read"})).toHaveCount(0);await notice.getByRole("link",{name:"Open notification"}).click();await page.getByRole("row").filter({hasText:`Verified scoring error ${title}`}).getByRole("button",{name:"Review request"}).click();await expect(page.getByRole("dialog")).toContainText("40.00");await expect(page.getByRole("dialog")).toContainText("55.50");await page.getByLabel("Decision reason").fill("Verified original scoring sheet; approved correction");await page.getByRole("button",{name:"Approve correction",exact:true}).click();await expect(page.getByRole("dialog")).not.toBeVisible();await page.getByRole("group",{name:"Filter correction requests by status"}).getByRole("button",{name:"Approved",exact:true}).click();await expect(page.getByRole("row").filter({hasText:`Verified scoring error ${title}`})).toContainText("Approved");const saved=await(await page.request.get(`/api/v1/manual-grades/${grade.id}/`)).json();expect(saved.marks).toBe("55.50");expect(saved.finalized).toBe(true);const audit=await(await page.request.get(`/api/v1/manual-grades/${grade.id}/grade-history/`)).json();expect(audit.results.some((row:{detail:{reason?:string}})=>row.detail.reason==="Verified original scoring sheet; approved correction")).toBe(true);await page.screenshot({path:"test-results/evidence/academic-reviews-desktop.png",fullPage:true});
});

test("department Head requires explicit course delegation for an independent correction", async ({ page }) => {
  await login(page, "university.teacher");
  const courses = await (await page.request.get("/api/v1/offerings/")).json();
  const course = courses.results.find((row: { title: string }) => row.title.startsWith("Introduction to Computing"));
  expect(course.head_correction_review).toBe(false);
  const roster = await (await page.request.get(`/api/v1/enrollments/?offering=${course.id}&active=true`)).json();
  const title = `Department review ${Date.now()}`;
  const grade = await post(page, "manual-grades", {
    offering: course.id, student: roster.results[0].student, title,
    marks: 40, max_marks: 100, released: true,
  });
  await post(page, "corrections", {
    kind: "manual", target: grade.id, proposed: { marks: "56.25" },
    reason: title,
  });
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "university.admin");
  const csrf = (await page.context().cookies()).find(cookie => cookie.name === "csrftoken")!.value;
  expect((await page.request.patch(`/api/v1/offerings/${course.id}/`, { data: { head_correction_review: true }, headers: { "X-CSRFToken": csrf } })).ok()).toBe(true);
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "university.head");
  await page.goto("/academic-reviews");
  await page.getByRole("row").filter({ hasText: title })
    .getByRole("button", { name: "Review request" }).click();
  await expect(page.getByRole("dialog")).toContainText("40.00");
  await expect(page.getByRole("dialog")).toContainText("56.25");
  await page.getByLabel("Decision reason").fill("Checked the original rubric within my department");
  await page.getByRole("button", { name: "Approve correction", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const saved = await (await page.request.get(`/api/v1/manual-grades/${grade.id}/`)).json();
  expect(saved.marks).toBe("56.25");
});
