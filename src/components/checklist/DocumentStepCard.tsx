import React, { useState } from 'react';

interface Step {
	id: string;
	title: string;
	description: string;
	status: 'complete' | 'in-progress' | 'pending';
	actionLabel?: string;
}

export const DocumentStepCard: React.FC = () => {
	const [activeStep, setActiveStep] = useState<string | null>('1');

	const steps: Step[] = [
		{
			id: '1',
			title: 'Complete Form DL-40',
			description:
				'Gather your primary ID checklist. Download the form below, print it, or fill it out digitally with your current residential address.',
			status: 'in-progress',
			actionLabel: 'Download Form (PDF)',
		},
		{
			id: '2',
			title: 'Gather 2 Proofs of Residency',
			description:
				"You'll need physical mail (bank statement, utility bill, paystub, or formal agency letter) showing your full name and current address.",
			status: 'pending',
			actionLabel: 'Upload Proof',
		},
		{
			id: '3',
			title: 'Schedule DMV Appointment',
			description:
				"Go online or call the regional office to book your 'First-Time ID / License' slot. Bring cash/card for the $15-$25 processing fee.",
			status: 'pending',
			actionLabel: 'Find Nearest Location',
		},
	];

	return (
		<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-5 space-y-4">
			<div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
				<div>
					<h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
						State ID Checklist Guide
					</h3>
					<p className="text-xs text-slate-400 dark:text-slate-500">
						3 critical steps to secure your credentials
					</p>
				</div>
				<div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold text-xs rounded-full border border-emerald-100 dark:border-emerald-900/30">
					Step 1 of 3 Active
				</div>
			</div>

			<div className="space-y-3">
				{steps.map((step) => {
					const isOpen = activeStep === step.id;

					return (
						<div
							key={step.id}
							className={`border rounded-xl transition-all duration-300 overflow-hidden ${
								isOpen
									? 'bg-slate-50/50 dark:bg-slate-950/40 border-sky-200 dark:border-sky-950 shadow-[0_0_12px_rgba(14,165,233,0.06)]'
									: 'bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700'
							}`}
						>
							<button
								type="button"
								aria-expanded={isOpen}
								aria-controls={`document-step-${step.id}-content`}
								onClick={() => setActiveStep(isOpen ? null : step.id)}
								className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3"
							>
								<div className="flex items-center gap-3">
									<span
										className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
											isOpen
												? 'bg-sky-500 text-white shadow-[0_0_8px_rgba(14,165,233,0.3)] animate-pulse'
												: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
										}`}
									>
										{step.id}
									</span>
									<div>
										<h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
											{step.title}
										</h4>
										<p className="text-[10px] text-slate-400 dark:text-slate-500">
											{step.status === 'in-progress'
												? '🔔 Continue task'
												: '🔒 Prerequisite required'}
										</p>
									</div>
								</div>
								<span className="text-slate-400 text-xs" aria-hidden="true">
									{isOpen ? '▲' : '▼'}
								</span>
							</button>

							{isOpen && (
								<div
									id={`document-step-${step.id}-content`}
									className="px-4 pb-4 pl-[3.25rem] space-y-3 border-t border-slate-100/50 dark:border-slate-800/30 pt-3"
								>
									<p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
										{step.description}
									</p>
									{step.actionLabel && (
										<button
											type="button"
											className="px-3 py-1.5 bg-sky-50 dark:bg-sky-950 hover:bg-sky-100 dark:hover:bg-sky-900 text-sky-600 dark:text-sky-400 font-semibold text-[11px] rounded-lg border border-sky-100 dark:border-sky-900 transition flex items-center gap-1.5"
										>
											📎 {step.actionLabel}
										</button>
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
};
