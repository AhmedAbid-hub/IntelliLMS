import {test,expect} from '@playwright/test';

test('Head can open an unclipped eligible-teacher dropdown and appoint an authorized teacher',async({page})=>{
  async function login(username:string){
    await page.goto('/login');await page.getByLabel('Username').fill(username);
    await page.getByLabel('Password',{exact:true}).fill('LearnTogether42!');
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await expect(page.getByRole('button',{name:'Sign out'})).toBeVisible();
  }
  await login('university.admin');
  const unit=(await(await page.request.get('/api/v1/units/')).json()).results[0];
  const username=`eligible-${Date.now()}`;
  const csrf=(await page.context().cookies()).find(c=>c.name==='csrftoken')!.value;
  const provision=await page.request.post('/api/v1/memberships/',{headers:{'X-CSRFToken':csrf},data:{username,email:`${username}@example.test`,role:'teacher',eligible_units:[unit.id]}});
  expect(provision.status()).toBe(201);
  const member=await provision.json();expect(member.unit).toBeNull();
  await page.getByRole('button',{name:'Sign out'}).click();await login('university.head');
  await page.goto('/teacher-appointments');
  await expect(page.getByRole('cell',{name:'university.teacher',exact:true})).toBeVisible();
  for (const width of [1280,390]) {
    await page.setViewportSize({width,height:900});
    await page.getByRole('button',{name:'Eligible teacher',exact:true}).click();
    const option=page.getByRole('option',{name:username,exact:true});
    await expect(option).toBeVisible();
    // Clickability catches overflow clipping; DOM presence alone missed this bug.
    await option.click({trial:true});
    await page.screenshot({path:`../docs/images/appointment-dropdown-${width}.png`,fullPage:true});
    await option.click();
    await expect(page.getByRole('button',{name:'Eligible teacher',exact:true})).toContainText(username);
  }
  await page.getByRole('button',{name:'Review appointment',exact:true}).click();
  await page.getByLabel('Appointment reason').fill('Authorized department appointment for the new term');
  await page.getByRole('button',{name:'Confirm appointment change'}).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('cell',{name:username,exact:true})).toBeVisible();
  await expect(page.getByRole('cell',{name:'university.teacher',exact:true})).toBeVisible();
  const candidates=await(await page.request.get(`/api/v1/teacher-appointments/candidates/?search=${username}`)).json();
  expect(candidates.results[0].id).toBe(member.id);expect(candidates.results[0].appointed).toBe(true);
});
