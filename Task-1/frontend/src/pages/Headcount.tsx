import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { getCurrentUser, getTeams } from '../features/users/api';
import { getHeadcountAggregation } from '../features/headcount/api';
import { getSpecialDays } from '../features/locations/api';
import type { MealType, HeadcountAggregationRow } from '../types';

const mealTypes: (MealType | 'All')[] = ['Lunch', 'Snacks', 'Iftar', 'EventDinner', 'OptionalDinner', 'All'];

export function Headcount() {
  const { isAuthenticated } = useAuth();
  const [selectedMeal, setSelectedMeal] = useState<MealType>('Lunch');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | undefined>(undefined);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: getTeams,
    enabled: currentUser?.role === 'Admin' || currentUser?.role === 'Logistics',
  });

  const { data: aggregationData, isLoading: aggregationLoading, refetch: refetchAggregation } = useQuery({
    queryKey: ['headcount', 'aggregation', selectedDate, currentUser?.id],
    queryFn: () => getHeadcountAggregation(selectedDate),
    enabled: !!currentUser,
  });

  const isAdmin = currentUser?.role === 'Admin';
  const isLogistics = currentUser?.role === 'Logistics';
  const isTeamLead = currentUser?.role === 'TeamLead';

  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: specialDays } = useQuery({
    queryKey: ['special-days'],
    queryFn: getSpecialDays,
    enabled: isAdmin || isLogistics,
  });

  // Helper function to get total opted_in for a specific meal type from aggregation data
  const getMealTotal = useMemo(() => {
    return (mealType: string) => {
      return aggregationData?.data?.reduce((sum: number, row: HeadcountAggregationRow) => {
        if (row.meal === mealType) {
          return sum + row.total_in;
        }
        return sum;
      }, 0) || 0;
    };
  }, [aggregationData]);

  // Calculate summary from aggregation data (table data) to sync with Stats Cards
  const tableSummary = useMemo(() => {
    const data = aggregationData?.data || [];
    // Filter by team if selected
    const filteredData = selectedTeamId !== undefined
      ? data.filter(row => row.team_id === selectedTeamId)
      : data;
    
    // Calculate totals based on selected meal type
    const totalIn = (selectedMeal as string) === 'All'
      ? filteredData.reduce((sum, row) => sum + (row.total_in ?? 0), 0)
      : filteredData.filter(row => row.meal === (selectedMeal as string)).reduce((sum, row) => sum + (row.total_in ?? 0), 0);
    const totalOut = (selectedMeal as string) === 'All'
      ? filteredData.reduce((sum, row) => sum + (row.total_out ?? 0), 0)
      : filteredData.filter(row => row.meal === (selectedMeal as string)).reduce((sum, row) => sum + (row.total_out ?? 0), 0);
    
    // Total employees = office + WFH headcount (independent of meal opt-in).
    // office_count and wfh_count are now true location totals (same across all meal rows for a team),
    // so deduplicate by team to avoid counting each team multiple times.
    const seenTeams = new Set<number | string>();
    let totalEmployees = 0;
    filteredData.forEach(row => {
      const key = row.team_id != null ? row.team_id : (row.team ?? 'unassigned');
      if (!seenTeams.has(key)) {
        seenTeams.add(key);
        totalEmployees += (row.office_count ?? 0) + (row.wfh_count ?? 0);
      }
    });
    
    const optedInPercentage = totalEmployees > 0 ? (totalIn / totalEmployees) * 100 : 0;
    const optedOutPercentage = totalEmployees > 0 ? (totalOut / totalEmployees) * 100 : 0;
    
    return {
      total_employees: totalEmployees,
      opted_in: totalIn,
      opted_out: totalOut,
      opted_in_percentage: optedInPercentage,
      opted_out_percentage: optedOutPercentage
    };
  }, [aggregationData, selectedMeal, selectedTeamId]);

  const optedInPercentage = tableSummary.opted_in_percentage;
  const optedOutPercentage = tableSummary.opted_out_percentage;

  const announcementText = useMemo(() => {
    const data = aggregationData?.data ?? [];
    const specialDay = specialDays?.find((d) => d.date === selectedDate);
    const status = specialDay
      ? `${specialDay.type}${specialDay.note ? ` — ${specialDay.note}` : ''}`
      : 'Regular Day';

    const mealOrder: MealType[] = ['Lunch', 'Snacks', 'Iftar', 'EventDinner', 'OptionalDinner'];
    const mealDisplayNames: Record<MealType, string> = {
      Lunch: 'Lunch',
      Snacks: 'Snacks',
      Iftar: 'Iftar',
      EventDinner: 'Event Dinner',
      OptionalDinner: 'Optional Dinner',
    };

    const mealLines = mealOrder
      .map((meal) => {
        const rows = data.filter((r) => r.meal === meal);
        const totalIn = rows.reduce((s, r) => s + r.total_in, 0);
        const officeIn = rows.reduce((s, r) => s + r.office_in, 0);
        const wfhIn = rows.reduce((s, r) => s + r.wfh_in, 0);
        if (totalIn === 0) return null;
        return `  • ${mealDisplayNames[meal]}: ${totalIn} (Office: ${officeIn}, WFH: ${wfhIn})`;
      })
      .filter(Boolean)
      .join('\n');

    // Deduplicate by team to get true day-level office/WFH headcount
    const seenTeams = new Set<number | string>();
    let totalOfficeHeadcount = 0;
    let totalWfhHeadcount = 0;
    data.forEach(row => {
      const key = row.team_id != null ? row.team_id : (row.team ?? 'unassigned');
      if (!seenTeams.has(key)) {
        seenTeams.add(key);
        totalOfficeHeadcount += row.office_count ?? 0;
        totalWfhHeadcount += row.wfh_count ?? 0;
      }
    });
    const locationLine = `\nLocation:\n  🏢 In Office: ${totalOfficeHeadcount}\n  🏠 WFH: ${totalWfhHeadcount}`;

    return `📅 ${selectedDate} — ${status}\n\nHeadcount:\n${mealLines || '  (no data)'}${locationLine}`;
  }, [aggregationData, selectedDate, specialDays]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchAggregation();
    }, 10000);
    return () => clearInterval(interval);
  }, [refetchAggregation]);

  if (!currentUser || aggregationLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Headcount
            {isTeamLead && currentUser.team_name && (
              <span className="text-lg font-normal text-gray-500 ml-2">— {currentUser.team_name}</span>
            )}
          </h1>
          <p className="mt-2 text-gray-600">View meal participation and headcount statistics</p>
        </div>
        {(isAdmin || isLogistics) && (
          <button
            onClick={() => { setAnnouncementOpen(true); setCopied(false); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Generate Announcement
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Employees</p>
              <p className="mt-2 text-3xl font-bold text-blue-900">
                {tableSummary.total_employees || 0}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Opted In ({selectedMeal})</p>
              <p className="mt-2 text-3xl font-bold text-green-900">
                {tableSummary.opted_in || 0}
              </p>
              <p className="text-sm text-green-700">{(isNaN(optedInPercentage) ? 0 : optedInPercentage).toFixed(1)}%</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Opted Out ({selectedMeal})</p>
              <p className="mt-2 text-3xl font-bold text-red-900">
                {tableSummary.opted_out || 0}
              </p>
              <p className="text-sm text-red-700">{(isNaN(optedOutPercentage) ? 0 : optedOutPercentage).toFixed(1)}%</p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
          </div>
        </div>
      </div>

      {/* Participation Progress Bar */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Participation Progress ({selectedMeal})
        </h2>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-green-600 h-4 rounded-full transition-all duration-300"
            style={{ width: `${isNaN(optedInPercentage) ? 0 : optedInPercentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>{(isNaN(optedInPercentage) ? 0 : optedInPercentage).toFixed(1)}% opted in</span>
          <span>{(isNaN(optedOutPercentage) ? 0 : optedOutPercentage).toFixed(1)}% opted out</span>
        </div>
      </div>

      {/* Headcount Summary Table */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Headcount Summary</h2>
          <span className="text-sm text-gray-500">Auto-refreshes every 10 seconds</span>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex-1">
            <label htmlFor="agg-date" className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              id="agg-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="agg-meal" className="block text-sm font-medium text-gray-700 mb-2">
              Meal Type
            </label>
            <select
              id="agg-meal"
              value={selectedMeal}
              onChange={(e) => setSelectedMeal(e.target.value as MealType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {mealTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          {(isAdmin || isLogistics) && (
            <div className="flex-1">
              <label htmlFor="agg-team" className="block text-sm font-medium text-gray-700 mb-2">
                Team
              </label>
              <select
                id="agg-team"
                value={selectedTeamId?.toString() || ''}
                onChange={(e) =>
                  setSelectedTeamId(e.target.value ? parseInt(e.target.value, 10) : undefined)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Teams</option>
                {teams?.map((team) => (
                  <option key={team.id} value={team.id.toString()}>{team.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {aggregationLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (() => {
          const originalData = aggregationData?.data ?? [];
          if (originalData.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium">No headcount data for the selected filters</p>
              </div>
            );
          }

          // Get unique teams from original data
          const uniqueTeams = Array.from(new Set(originalData.map(row => row.team || 'Unassigned')));
          
          // Filter by team if selected
          const filteredTeams = selectedTeamId !== undefined 
            ? uniqueTeams.filter(team => {
                const teamData = originalData.find(row => (row.team || 'Unassigned') === team);
                return teamData?.team_id === selectedTeamId;
              })
            : uniqueTeams;

          return (
            <>
              <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
                <span className="font-medium text-gray-700">{filteredTeams.length}</span> team{filteredTeams.length !== 1 ? 's' : ''} · {selectedMeal}
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-sky-100 border-b border-sky-200">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-sky-800 uppercase tracking-wider">
                        Team
                      </th>
                      {/* Show meal type columns based on selection */}
                      {(selectedMeal as string) === 'All' ? (
                        ['Lunch', 'Snacks', 'Iftar', 'EventDinner', 'OptionalDinner'].map(mealType => (
                          <th key={mealType} className="px-6 py-4 text-center text-sm font-semibold text-sky-800 uppercase tracking-wider">
                            {mealType}
                          </th>
                        ))
                      ) : (
                        <th className="px-6 py-4 text-center text-sm font-semibold text-sky-800 uppercase tracking-wider">
                          {selectedMeal}
                        </th>
                      )}
                      {/* Total column - only shown when 'All' is selected */}
                      {(selectedMeal as string) === 'All' && (
                        <th className="px-6 py-4 text-center text-sm font-semibold text-sky-800 uppercase tracking-wider">
                          Total
                        </th>
                      )}
                      <th className="px-6 py-4 text-center text-sm font-semibold text-sky-800 uppercase tracking-wider">
                        Out
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-sky-800 uppercase tracking-wider">
                        Office
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-sky-800 uppercase tracking-wider">
                        WFH
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredTeams.map((team, index) => {
                      // Calculate totals for this team
                      const teamData = originalData.filter(row => (row.team || 'Unassigned') === team);
                      // When "All" is selected, sum all meal types. When specific meal type is selected, sum only that meal type.
                      const totalIn = (selectedMeal as string) === 'All'
                        ? teamData.reduce((sum, row) => sum + row.total_in, 0)
                        : teamData.filter(row => row.meal === (selectedMeal as string)).reduce((sum, row) => sum + row.total_in, 0);
                      const totalOut = (selectedMeal as string) === 'All'
                        ? teamData.reduce((sum, row) => sum + row.total_out, 0)
                        : teamData.filter(row => row.meal === (selectedMeal as string)).reduce((sum, row) => sum + row.total_out, 0);
                      // office_count and wfh_count are per-date, not per-meal — take from first row
                      const totalOffice = teamData[0]?.office_count ?? 0;
                      const totalWFH = teamData[0]?.wfh_count ?? 0;
                       
                      // Get opted in count for specific meal type when not "All"
                      const getMealInCount = (mealType: string) => {
                        return teamData
                          .filter(row => row.meal === mealType)
                          .reduce((sum, row) => sum + row.total_in, 0);
                      };
                      
                      return (
                        <tr
                          key={team}
                          className={`transition-colors duration-100 hover:bg-orange-50/40 ${
                            index % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 ring-2 ring-sky-50">
                                <span className="text-sm font-bold text-sky-700">
                                  {(team || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-base font-semibold text-gray-900">{team || 'Unassigned'}</span>
                            </div>
                          </td>
                          {/* Show meal type columns based on selection */}
                          {(selectedMeal as string) === 'All' ? (
                            ['Lunch', 'Snacks', 'Iftar', 'EventDinner', 'OptionalDinner'].map(mealType => (
                              <td key={mealType} className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-base font-semibold bg-green-50 text-green-700 border border-green-200">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414 1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  {getMealInCount(mealType)}
                                </span>
                              </td>
                            ))
                          ) : (
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-base font-semibold bg-green-50 text-green-700 border border-green-200">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414 1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                {getMealInCount(selectedMeal as string)}
                              </span>
                            </td>
                          )}
                          {/* Total column - only shown when 'All' is selected */}
                          {(selectedMeal as string) === 'All' && (
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="text-base font-bold text-gray-700">{totalIn}</span>
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-base font-bold text-red-700">{totalOut}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-base font-bold text-blue-700">{totalOffice}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-base font-bold text-violet-700">{totalWFH}</span>
                          </td>
                        </tr>
                      );
                    })}
 
                    {/* Totals row — only shown when multiple teams are visible */}
                    {filteredTeams.length > 1 && (() => {
                      const data = aggregationData?.data || [];
                      // Calculate totals based on selected meal type
                      const totalIn = (selectedMeal as string) === 'All'
                        ? data.reduce((s, r) => s + r.total_in, 0)
                        : data.filter(row => row.meal === (selectedMeal as string)).reduce((s, r) => s + r.total_in, 0);
                      const totalOut = (selectedMeal as string) === 'All'
                        ? data.reduce((s, r) => s + r.total_out, 0)
                        : data.filter(row => row.meal === (selectedMeal as string)).reduce((s, r) => s + r.total_out, 0);
                      // office_count and wfh_count are per-date, not per-meal — deduplicate by team
                      const seenTeamKeys = new Set<number | string>();
                      let totalOffice = 0;
                      let totalWFH = 0;
                      data.forEach(row => {
                        const key = row.team_id != null ? row.team_id : (row.team ?? 'unassigned');
                        if (!seenTeamKeys.has(key)) {
                          seenTeamKeys.add(key);
                          totalOffice += row.office_count ?? 0;
                          totalWFH += row.wfh_count ?? 0;
                        }
                      });
                       
                      return (
                        <tr className="bg-sky-50 border-t-2 border-sky-200">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-bold text-sky-800 uppercase tracking-widest">
                              All Teams
                            </span>
                          </td>
                          {/* Show meal type totals based on selection */}
                          {(selectedMeal as string) === 'All' ? (
                            ['Lunch', 'Snacks', 'Iftar', 'EventDinner', 'OptionalDinner'].map(mealType => (
                              <td key={mealType} className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="text-base font-bold text-green-700">{getMealTotal(mealType)}</span>
                              </td>
                            ))
                          ) : (
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="text-base font-bold text-green-700">{getMealTotal(selectedMeal as string)}</span>
                            </td>
                          )}
                          {/* Total column - only shown when 'All' is selected */}
                          {(selectedMeal as string) === 'All' && (
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="text-base font-bold text-gray-700">{totalIn}</span>
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-base font-bold text-red-700">{totalOut}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-base font-bold text-blue-700">{totalOffice}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-base font-bold text-violet-700">{totalWFH}</span>
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          );
        })()}
      </div>

      {/* Announcement Modal */}
      {announcementOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Daily Announcement</h3>
              <button
                onClick={() => setAnnouncementOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <pre className="w-full text-sm text-gray-800 bg-gray-50 rounded-lg border border-gray-200 p-4 whitespace-pre-wrap font-mono leading-relaxed">
                {announcementText}
              </pre>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setAnnouncementOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(announcementText).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                className="px-4 py-2 text-sm font-medium bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
