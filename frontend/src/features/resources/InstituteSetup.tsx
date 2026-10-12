import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ArrowUpRight } from "lucide-react";
import { api } from "../../lib/api";
import { PageHeader, Loading, ErrorState } from "../../components/shared";
type Step = {key:string;title:string;complete:boolean;optional:boolean;owner:string;path:string};
export function InstituteSetup() {
  const query = useQuery({queryKey:["institute-setup"],queryFn:()=>api<{steps:Step[];completed:number;total:number;ready:boolean}>("institute-setup/")});
  if(query.isPending) return <Loading/>;
  if(query.isError) return <ErrorState error={query.error}/>;
  const data=query.data;
  return <><PageHeader title="Institute setup" description="Build your academic workspace in dependency order. Each saved record updates this checklist; return any time to continue."/>
    <section className="panel compact" aria-label="Setup progress"><h2>{data.completed} of {data.total} essentials configured</h2><progress value={data.completed} max={data.total} aria-label="Required setup steps completed"/><p className="muted">These indicators confirm that records exist. Review each program, class and policy before starting operations.</p>{data.ready && <p className="info-strip">The basic setup checklist is configured. Open Courses &amp; Enrollments to begin academic operations.</p>}</section>
    <div className="setup-steps">{data.steps.map((step,index)=><section className="panel setup-step" key={step.key}>{step.complete?<CheckCircle2 aria-hidden="true"/>:<Circle aria-hidden="true"/>}<div><h2>{index+1}. {step.title}</h2><p className="muted">{step.owner} · {step.complete?"Configured":"To do"}{step.optional?" · Optional":""}</p></div><Link className="text-link" to={step.path} aria-label={`Open: ${step.title}`}>Open <ArrowUpRight size={16} aria-hidden="true"/></Link></section>)}</div></>;
}
