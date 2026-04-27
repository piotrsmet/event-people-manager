<?php

namespace App\Http\Controllers;

use App\Models\Shift;
use Illuminate\Http\Request;
use App\Http\Resources\ShiftResource;

class ShiftController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        
        $shifts = Shift::with(['zone.event'])->get();

        return ShiftResource::collection($shifts);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Shift $shift)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Shift $shift)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Shift $shift)
    {
        //
    }

    public function apply(Request $request, Shift $shift)
    {
        $userId = $request->user()->id;

        if ($shift->users()->where('user_id', $userId)->exists()) {
            return response()->json(['message' => 'You have already applied for this shift.'], 409);
        }

        $shift->users()->attach($userId, ['status' => 'pending']);

        return response()->json(['message' => 'Application submitted successfully.'], 201);
    }
}
